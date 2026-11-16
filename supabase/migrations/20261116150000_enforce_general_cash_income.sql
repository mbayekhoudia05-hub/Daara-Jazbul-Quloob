-- All receipts must enter the general cash fund.
-- Existing historical contributions are intentionally not backfilled here.
create or replace function public.enforce_general_cash_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.movement_type = 'income' and not exists (
    select 1 from public.cash_funds f
    where f.id = new.fund_id and f.fund_type = 'general'
  ) then
    raise exception 'Toute recette doit être enregistrée dans la caisse générale. Utilisez un transfert pour alimenter une sous-caisse.';
  end if;
  return new;
end;
$$;

drop trigger if exists cash_income_must_be_general on public.cash_movements;
create trigger cash_income_must_be_general
before insert or update of fund_id, movement_type on public.cash_movements
for each row execute function public.enforce_general_cash_income();

create unique index if not exists cash_movements_one_contribution_income_idx
on public.cash_movements(contribution_id)
where contribution_id is not null and movement_type = 'income';

create or replace function public.sync_paid_contribution_to_cash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_fund uuid;
begin
  select id into v_fund from public.cash_funds where fund_type = 'general' limit 1;
  if v_fund is null then return new; end if;

  if tg_op = 'INSERT' then
    if new.status = 'paid' then
      insert into public.cash_movements(
        fund_id, movement_type, amount, movement_date, category,
        description, contribution_id, created_by
      ) values (
        v_fund, 'income', new.amount, new.payment_date, new.category,
        'Cotisation membre', new.id, auth.uid()
      ) on conflict (contribution_id)
        where contribution_id is not null and movement_type = 'income'
        do nothing;
    end if;
    return new;
  end if;

  if old.status <> 'paid' and new.status = 'paid' then
    insert into public.cash_movements(
      fund_id, movement_type, amount, movement_date, category,
      description, contribution_id, created_by
    ) values (
      v_fund, 'income', new.amount, new.payment_date, new.category,
      'Cotisation membre', new.id, auth.uid()
    ) on conflict (contribution_id)
      where contribution_id is not null and movement_type = 'income'
      do nothing;
  elsif old.status = 'paid' and new.status <> 'paid' and exists (
    select 1 from public.cash_movements
    where contribution_id = new.id and movement_type = 'income'
  ) then
    insert into public.cash_movements(
      fund_id, movement_type, amount, movement_date, category,
      description, contribution_id, created_by
    ) values (
      v_fund, 'adjustment_out', old.amount, current_date, new.category,
      'Annulation/correction cotisation #' || new.id, new.id, auth.uid()
    );
  elsif old.status = 'paid' and new.status = 'paid' and old.amount <> new.amount and exists (
    select 1 from public.cash_movements
    where contribution_id = new.id and movement_type = 'income'
  ) then
    if new.amount > old.amount then
      insert into public.cash_movements(
        fund_id, movement_type, amount, movement_date, category,
        description, contribution_id, created_by
      ) values (
        v_fund, 'adjustment_in', new.amount - old.amount, current_date,
        new.category, 'Correction montant cotisation #' || new.id, new.id, auth.uid()
      );
    else
      insert into public.cash_movements(
        fund_id, movement_type, amount, movement_date, category,
        description, contribution_id, created_by
      ) values (
        v_fund, 'adjustment_out', old.amount - new.amount, current_date,
        new.category, 'Correction montant cotisation #' || new.id, new.id, auth.uid()
      );
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_general_cash_income() from public;
revoke all on function public.sync_paid_contribution_to_cash() from public;
