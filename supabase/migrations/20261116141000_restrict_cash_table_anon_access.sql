-- New public tables inherit explicit anon grants in this project.
-- Remove them; authenticated access remains governed by the RLS policies.
revoke all privileges on table
  public.cash_funds,
  public.cash_movements,
  public.cash_expense_requests,
  public.cash_transfers,
  public.cash_audit_log
from anon;
