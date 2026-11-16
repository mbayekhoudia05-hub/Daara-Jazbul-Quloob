-- Record manual receipts only in the general cash fund.
create or replace function public.record_general_cash_income(
  p_amount numeric,
  p_category text,
  p_date date,
  p_description text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fund_id uuid;
  v_movement_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin','finance')
  ) then
    raise exception 'Action réservée à la gestion financière.';
  end if;
  if p_amount is null or p_amount <= 0 or p_date is null
     or nullif(btrim(p_description),'') is null
     or p_category is null
     or p_category not in ('Mensualités','Tombes','Chasse','Autres recettes et divers') then
    raise exception 'Les informations de la recette sont invalides.';
  end if;
  select id into v_fund_id
  from public.cash_funds
  where fund_type = 'general' and is_active = true
  order by created_at
  limit 1;
  if v_fund_id is null then
    raise exception 'La caisse générale est introuvable ou inactive.';
  end if;
  insert into public.cash_movements(
    fund_id,movement_type,amount,movement_date,category,description,created_by
  ) values (
    v_fund_id,'income',p_amount,p_date,p_category,btrim(p_description),auth.uid()
  ) returning id into v_movement_id;
  return v_movement_id;
end;
$$;

revoke all on function public.record_general_cash_income(numeric,text,date,text) from public, anon;\n-- Trigger-only guard: never expose direct RPC execution to application roles.\nrevoke all on function public.enforce_general_cash_income() from public, anon, authenticated;
grant execute on function public.record_general_cash_income(numeric,text,date,text) to authenticated;
