-- Tighten function execution ACLs for Supabase's explicit anon grants.
-- Trigger-only functions must not be callable through the Data API.
revoke all on function public.log_cash_record_change() from anon, authenticated, public;
revoke all on function public.sync_paid_contribution_to_cash() from anon, authenticated, public;

-- RPCs used by the authenticated finance/admin interface.
revoke all on function public.record_cash_opening_balance(uuid,numeric,date,text) from anon, public;
revoke all on function public.approve_cash_expense(uuid,boolean,text) from anon, public;
revoke all on function public.pay_cash_expense(uuid,date) from anon, public;
revoke all on function public.request_cash_transfer(uuid,uuid,numeric,text) from anon, public;
revoke all on function public.approve_cash_transfer(uuid,boolean,text) from anon, public;

grant execute on function public.record_cash_opening_balance(uuid,numeric,date,text) to authenticated;
grant execute on function public.approve_cash_expense(uuid,boolean,text) to authenticated;
grant execute on function public.pay_cash_expense(uuid,date) to authenticated;
grant execute on function public.request_cash_transfer(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.approve_cash_transfer(uuid,boolean,text) to authenticated;
