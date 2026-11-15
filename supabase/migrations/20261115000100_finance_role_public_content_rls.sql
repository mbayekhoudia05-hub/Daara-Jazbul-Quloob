-- Separate public published-content reads from administrator-only profile checks.
-- Add a finance-only role without changing member or administrator records beyond the two named accounts.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'admin', 'finance'));

DROP POLICY IF EXISTS "Public and admins read events" ON public.dahira_events;
CREATE POLICY "Anonymous can read published events"
  ON public.dahira_events FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY "Authenticated can read published events and admin events"
  ON public.dahira_events FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Public and admins read gallery" ON public.dahira_gallery;
CREATE POLICY "Anonymous can read published gallery"
  ON public.dahira_gallery FOR SELECT TO anon
  USING (is_published = true);
CREATE POLICY "Authenticated can read published gallery and admin gallery"
  ON public.dahira_gallery FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Finance managers can manage contributions" ON public.contributions;
CREATE POLICY "Finance managers can manage contributions"
  ON public.contributions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  );

DROP POLICY IF EXISTS "Finance managers can manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Finance managers can manage payment transactions"
  ON public.payment_transactions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  );

DROP POLICY IF EXISTS "Finance managers can manage payment categories" ON public.payment_categories;
CREATE POLICY "Finance managers can manage payment categories"
  ON public.payment_categories FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  );

DROP POLICY IF EXISTS "Finance managers can view members" ON public.members;
CREATE POLICY "Finance managers can view members"
  ON public.members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'finance')
  );

CREATE OR REPLACE FUNCTION public.confirm_payment_transaction(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
 v_tx public.payment_transactions%rowtype;
 v_contribution_id uuid;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','finance')) then
  raise exception 'Action réservée à la gestion financière.';
 end if;
 select * into v_tx from public.payment_transactions where id=p_transaction_id for update;
 if not found then raise exception 'Transaction introuvable.'; end if;
 if v_tx.status='confirmed' then
  select id into v_contribution_id from public.contributions where payment_transaction_id=v_tx.id;
  if v_contribution_id is null then raise exception 'Transaction déjà confirmée sans cotisation liée. Vérification manuelle nécessaire.'; end if;
  return jsonb_build_object('status','already_confirmed','contribution_id',v_contribution_id);
 end if;
 if v_tx.status<>'pending' then raise exception 'Seules les transactions en attente peuvent être confirmées.'; end if;
 if v_tx.member_id is null or v_tx.amount is null or v_tx.amount<=0 or v_tx.payment_month is null
   or v_tx.payment_method not in ('wave','orange_money')
   or not exists(select 1 from public.payment_categories where id=v_tx.category) then
  raise exception 'Informations de paiement invalides.';
 end if;
 select id into v_contribution_id from public.contributions where payment_transaction_id=v_tx.id;
 if v_contribution_id is null then
  insert into public.contributions(member_id,amount,payment_month,payment_date,payment_method,category,status,reference,note,paid_at,payment_transaction_id)
  values(v_tx.member_id,v_tx.amount,v_tx.payment_month,v_tx.payment_date,v_tx.payment_method,v_tx.category,'paid',v_tx.reference,
   coalesce(v_tx.note,'Paiement confirmé depuis le module Paiements'),now(),v_tx.id)
  returning id into v_contribution_id;
 else
  if not exists(select 1 from public.contributions where id=v_contribution_id and member_id=v_tx.member_id
    and amount=v_tx.amount and payment_month=v_tx.payment_month and payment_method=v_tx.payment_method and category=v_tx.category) then
   raise exception 'La cotisation liée ne correspond pas à la transaction.';
  end if;
 end if;
 update public.payment_transactions set status='confirmed',confirmed_at=now() where id=v_tx.id and status='pending';
 return jsonb_build_object('status','confirmed','contribution_id',v_contribution_id,'transaction_id',v_tx.id);
end;
$function$;

-- Member payment submission is disabled in the member portal; preserve historical rows.
REVOKE EXECUTE ON FUNCTION public.submit_member_payment(uuid,numeric,text,date,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_payment_beneficiaries() FROM authenticated;
