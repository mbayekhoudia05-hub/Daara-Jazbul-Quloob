-- Gestion de caisse du Daara Jazbul Quluub
-- Additive migration: existing contribution/payment tables and rows are preserved.

create table if not exists public.cash_funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fund_type text not null check (fund_type in ('general','activity')),
  parent_fund_id uuid references public.cash_funds(id),
  description text not null default '',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint cash_funds_parent_type_check check (
    (fund_type = 'general' and parent_fund_id is null) or
    (fund_type = 'activity' and parent_fund_id is not null)
  )
);

create unique index if not exists cash_funds_one_general_idx
  on public.cash_funds(fund_type) where fund_type = 'general';

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.cash_funds(id),
  movement_type text not null check (movement_type in (
    'opening_balance','income','expense','transfer_in','transfer_out',
    'adjustment_in','adjustment_out'
  )),
  amount numeric(14,2) not null check (amount > 0),
  movement_date date not null default current_date,
  category text not null default 'divers',
  description text not null default '',
  contribution_id uuid references public.contributions(id),
  transfer_id uuid,
  expense_request_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists cash_movements_fund_date_idx
  on public.cash_movements(fund_id, movement_date desc);
create index if not exists cash_movements_contribution_idx
  on public.cash_movements(contribution_id);

create table if not exists public.cash_expense_requests (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.cash_funds(id),
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'divers',
  description text not null,
  beneficiary text not null default '',
  receipt_url text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','paid','cancelled')),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  paid_by uuid references public.profiles(id),
  paid_at timestamptz,
  movement_id uuid references public.cash_movements(id),
  constraint cash_expense_distinct_approver check (
    approved_by is null or approved_by <> requested_by
  )
);

create index if not exists cash_expenses_status_date_idx
  on public.cash_expense_requests(status, requested_at desc);

create table if not exists public.cash_transfers (
  id uuid primary key default gen_random_uuid(),
  from_fund_id uuid not null references public.cash_funds(id),
  to_fund_id uuid not null references public.cash_funds(id),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending','posted','rejected','cancelled')),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  posted_at timestamptz,
  constraint cash_transfer_distinct_approver check (
    approved_by is null or approved_by <> requested_by
  ),
  constraint cash_transfer_different_funds check (from_fund_id <> to_fund_id)
);

create index if not exists cash_transfers_status_date_idx
  on public.cash_transfers(status, requested_at desc);

create table if not exists public.cash_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

alter table public.cash_funds enable row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_expense_requests enable row level security;
alter table public.cash_transfers enable row level security;
alter table public.cash_audit_log enable row level security;

drop policy if exists "Finance and admins view cash funds" on public.cash_funds;
create policy "Finance and admins view cash funds" on public.cash_funds
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);
drop policy if exists "Finance and admins manage cash funds" on public.cash_funds;
create policy "Finance and admins manage cash funds" on public.cash_funds
for all to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
) with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);

drop policy if exists "Finance and admins view cash movements" on public.cash_movements;
create policy "Finance and admins view cash movements" on public.cash_movements
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);
drop policy if exists "Finance and admins insert cash movements" on public.cash_movements;
create policy "Finance and admins insert cash movements" on public.cash_movements
for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);

drop policy if exists "Finance and admins view cash expenses" on public.cash_expense_requests;
create policy "Finance and admins view cash expenses" on public.cash_expense_requests
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);
drop policy if exists "Finance can submit cash expenses" on public.cash_expense_requests;
create policy "Finance can submit cash expenses" on public.cash_expense_requests
for insert to authenticated with check (
  requested_by = (select auth.uid()) and
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);
drop policy if exists "Admins can review cash expenses" on public.cash_expense_requests;
create policy "Admins can review cash expenses" on public.cash_expense_requests
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists "Finance and admins view cash transfers" on public.cash_transfers;
create policy "Finance and admins view cash transfers" on public.cash_transfers
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);
drop policy if exists "Finance can request cash transfers" on public.cash_transfers;
create policy "Finance can request cash transfers" on public.cash_transfers
for insert to authenticated with check (
  requested_by = (select auth.uid()) and
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);
drop policy if exists "Admins can review cash transfers" on public.cash_transfers;
create policy "Admins can review cash transfers" on public.cash_transfers
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

drop policy if exists "Finance and admins view cash audit log" on public.cash_audit_log;
create policy "Finance and admins view cash audit log" on public.cash_audit_log
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','finance'))
);

create or replace function public.log_cash_record_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := coalesce(new.id, old.id);
  insert into public.cash_audit_log(table_name, record_id, action, old_data, new_data, changed_by)
  values (
    tg_table_name, v_id, tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists cash_expense_audit on public.cash_expense_requests;
create trigger cash_expense_audit
after insert or update or delete on public.cash_expense_requests
for each row execute function public.log_cash_record_change();

drop trigger if exists cash_transfer_audit on public.cash_transfers;
create trigger cash_transfer_audit
after insert or update or delete on public.cash_transfers
for each row execute function public.log_cash_record_change();

-- Seed the general cash container only. No historic receipts are imported as cash,
-- because previous expenditures are not yet reconciled and must not inflate today's balance.
insert into public.cash_funds(name, fund_type, description)
select 'Caisse générale', 'general', 'Caisse centrale du Daara Jazbul Quluub'
where not exists (select 1 from public.cash_funds where fund_type = 'general');

create or replace function public.record_cash_opening_balance(
  p_fund_id uuid, p_amount numeric, p_date date, p_note text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Seul l’administrateur principal peut enregistrer le solde initial.';
  end if;
  if p_amount is null or p_amount < 0 or p_date is null then
    raise exception 'Solde initial ou date invalide.';
  end if;
  if exists (select 1 from public.cash_movements where fund_id = p_fund_id and movement_type = 'opening_balance') then
    raise exception 'Le solde initial de cette caisse est déjà enregistré.';
  end if;
  insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,created_by)
  values (p_fund_id,'opening_balance',greatest(p_amount,0.01),p_date,'solde_initial',coalesce(nullif(btrim(p_note),''),'Solde initial de caisse'),auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_cash_expense(p_expense_id uuid, p_approve boolean, p_reason text default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v public.cash_expense_requests%rowtype;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Seul l’administrateur principal peut valider une dépense.';
  end if;
  select * into v from public.cash_expense_requests where id = p_expense_id for update;
  if not found then raise exception 'Demande de dépense introuvable.'; end if;
  if v.status <> 'pending' then raise exception 'Cette demande a déjà été traitée.'; end if;
  if v.requested_by = auth.uid() then raise exception 'La personne qui demande la dépense ne peut pas la valider.'; end if;
  update public.cash_expense_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      approved_by = auth.uid(), approved_at = now(),
      rejection_reason = case when p_approve then null else nullif(btrim(p_reason),'') end
  where id = p_expense_id;
  return jsonb_build_object('success',true,'status',case when p_approve then 'approved' else 'rejected' end);
end;
$$;

create or replace function public.pay_cash_expense(p_expense_id uuid, p_date date default current_date)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v public.cash_expense_requests%rowtype; v_movement uuid; v_balance numeric;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','finance')) then
    raise exception 'Action réservée à la gestion financière.';
  end if;
  select * into v from public.cash_expense_requests where id = p_expense_id for update;
  if not found or v.status <> 'approved' then raise exception 'Seule une dépense validée peut être payée.'; end if;
  select coalesce(sum(case when movement_type in ('income','opening_balance','transfer_in','adjustment_in') then amount else -amount end),0)
    into v_balance from public.cash_movements where fund_id = v.fund_id;
  if v_balance < v.amount then raise exception 'Solde insuffisant dans cette caisse.'; end if;
  insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,expense_request_id,created_by)
  values (v.fund_id,'expense',v.amount,coalesce(p_date,current_date),v.category,
    v.description || case when v.beneficiary <> '' then ' — Bénéficiaire : '||v.beneficiary else '' end,
    v.id,auth.uid())
  returning id into v_movement;
  update public.cash_expense_requests
  set status='paid',paid_by=auth.uid(),paid_at=now(),movement_id=v_movement
  where id=v.id;
  return jsonb_build_object('success',true,'movement_id',v_movement);
end;
$$;

create or replace function public.request_cash_transfer(
  p_from_fund_id uuid,p_to_fund_id uuid,p_amount numeric,p_reason text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','finance')) then
    raise exception 'Action réservée à la gestion financière.';
  end if;
  if p_amount is null or p_amount <= 0 or p_from_fund_id = p_to_fund_id or nullif(btrim(p_reason),'') is null then
    raise exception 'Informations du transfert invalides.';
  end if;
  insert into public.cash_transfers(from_fund_id,to_fund_id,amount,reason,requested_by)
  values (p_from_fund_id,p_to_fund_id,p_amount,btrim(p_reason),auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_cash_transfer(p_transfer_id uuid,p_approve boolean,p_reason text default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v public.cash_transfers%rowtype; v_balance numeric;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Seul l’administrateur principal peut valider un transfert.';
  end if;
  select * into v from public.cash_transfers where id=p_transfer_id for update;
  if not found or v.status <> 'pending' then raise exception 'Transfert introuvable ou déjà traité.'; end if;
  if v.requested_by=auth.uid() then raise exception 'Le demandeur ne peut pas valider son propre transfert.'; end if;
  if not p_approve then
    update public.cash_transfers set status='rejected',approved_by=auth.uid(),approved_at=now() where id=v.id;
    return jsonb_build_object('success',true,'status','rejected');
  end if;
  select coalesce(sum(case when movement_type in ('income','opening_balance','transfer_in','adjustment_in') then amount else -amount end),0)
    into v_balance from public.cash_movements where fund_id=v.from_fund_id;
  if v_balance < v.amount then raise exception 'Solde insuffisant dans la caisse source.'; end if;
  insert into public.cash_movements(fund_id,movement_type,amount,category,description,transfer_id,created_by)
  values (v.from_fund_id,'transfer_out',v.amount,'transfert',v.reason,v.id,auth.uid()),
         (v.to_fund_id,'transfer_in',v.amount,'transfert',v.reason,v.id,auth.uid());
  update public.cash_transfers set status='posted',approved_by=auth.uid(),approved_at=now(),posted_at=now() where id=v.id;
  return jsonb_build_object('success',true,'status','posted');
end;
$$;

-- New paid contributions feed the general cash ledger once; historical records stay
-- in the existing contribution history and are intentionally not backfilled.
create or replace function public.sync_paid_contribution_to_cash()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_fund uuid; v_old_amount numeric; v_new_amount numeric;
begin
  select id into v_fund from public.cash_funds where fund_type='general' limit 1;
  if v_fund is null then return new; end if;

  if tg_op='INSERT' then
    if new.status='paid' then
      insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,contribution_id,created_by)
      values (v_fund,'income',new.amount,new.payment_date,new.category,'Cotisation membre',new.id,auth.uid())
      on conflict do nothing;
    end if;
    return new;
  end if;

  if old.status <> 'paid' and new.status='paid' then
    insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,contribution_id,created_by)
    values (v_fund,'income',new.amount,new.payment_date,new.category,'Cotisation membre',new.id,auth.uid());
  elsif old.status='paid' and new.status <> 'paid' then
    insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,contribution_id,created_by)
    values (v_fund,'adjustment_out',old.amount,current_date,new.category,'Annulation/correction cotisation #'||new.id,new.id,auth.uid());
  elsif old.status='paid' and new.status='paid' and old.amount <> new.amount then
    if new.amount > old.amount then
      insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,contribution_id,created_by)
      values (v_fund,'adjustment_in',new.amount-old.amount,current_date,new.category,'Correction montant cotisation #'||new.id,new.id,auth.uid());
    else
      insert into public.cash_movements(fund_id,movement_type,amount,movement_date,category,description,contribution_id,created_by)
      values (v_fund,'adjustment_out',old.amount-new.amount,current_date,new.category,'Correction montant cotisation #'||new.id,new.id,auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists contributions_cash_ledger_sync on public.contributions;
create trigger contributions_cash_ledger_sync
after insert or update of status, amount on public.contributions
for each row execute function public.sync_paid_contribution_to_cash();

revoke all on function public.record_cash_opening_balance(uuid,numeric,date,text) from public;
revoke all on function public.approve_cash_expense(uuid,boolean,text) from public;
revoke all on function public.pay_cash_expense(uuid,date) from public;
revoke all on function public.request_cash_transfer(uuid,uuid,numeric,text) from public;
revoke all on function public.approve_cash_transfer(uuid,boolean,text) from public;
grant execute on function public.record_cash_opening_balance(uuid,numeric,date,text) to authenticated;
grant execute on function public.approve_cash_expense(uuid,boolean,text) to authenticated;
grant execute on function public.pay_cash_expense(uuid,date) to authenticated;
grant execute on function public.request_cash_transfer(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.approve_cash_transfer(uuid,boolean,text) to authenticated;
