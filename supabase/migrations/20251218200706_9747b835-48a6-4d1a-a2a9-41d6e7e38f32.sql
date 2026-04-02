-- =============================================
-- CORREÇÃO DE POLÍTICAS RLS DO PLANO FAMÍLIA
-- =============================================

-- 1. Permitir que usuários criem seu próprio plano família
CREATE POLICY "Users can create own family plan"
ON public.family_plans FOR INSERT
WITH CHECK (admin_user_id = auth.uid());

-- 2. Permitir que proprietários do plano insiram notificações
CREATE POLICY "Plan admins can insert notifications"
ON public.family_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_plans 
    WHERE id = family_plan_id AND admin_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role)
);