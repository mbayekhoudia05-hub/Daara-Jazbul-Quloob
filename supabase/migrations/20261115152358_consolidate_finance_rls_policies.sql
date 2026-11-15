-- Consolidate admin and finance access into existing RLS policies.
-- This preserves the same permissions while avoiding duplicate permissive policies.
ALTER POLICY "Admins can manage contributions" ON public.contributions
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ));
DROP POLICY IF EXISTS "Finance managers can manage contributions" ON public.contributions;

ALTER POLICY "Admins can manage payment transactions" ON public.payment_transactions
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ));
DROP POLICY IF EXISTS "Finance managers can manage payment transactions" ON public.payment_transactions;

ALTER POLICY "Members can view own profile" ON public.members
  USING (
    auth_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
    )
  );
DROP POLICY IF EXISTS "Finance managers can view members" ON public.members;

ALTER POLICY "Admins delete payment categories" ON public.payment_categories
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ));
ALTER POLICY "Admins insert payment categories" ON public.payment_categories
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ));
ALTER POLICY "Admins update payment categories" ON public.payment_categories
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
  ));
ALTER POLICY "Authenticated can view active payment categories" ON public.payment_categories
  USING (
    is_active
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','finance')
    )
  );
DROP POLICY IF EXISTS "Finance managers can manage payment categories" ON public.payment_categories;
