-- Desempenho das regras de acesso (aviso "auth_rls_initplan" do Supabase,
-- 102 regras; revisão de 26/10). Trocar auth.uid() por (select auth.uid())
-- faz o Postgres calcular o usuário uma vez por consulta, não uma vez por
-- linha. A regra continua exatamente a mesma — só fica mais rápida.
-- Reescreve só as regras do schema public que ainda chamam auth.uid(),
-- auth.role() ou auth.jwt() direto.

do $$
declare
  p record;
  v_using text;
  v_check text;
  -- auth.x() que ainda não está dentro de "SELECT auth.x() AS ..."
  v_regex constant text := '(?<!SELECT )auth\.(uid|role|jwt)\(\)';
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ v_regex or coalesce(with_check, '') ~ v_regex)
  loop
    v_using := regexp_replace(p.qual, v_regex, '(select auth.\1())', 'g');
    v_check := regexp_replace(p.with_check, v_regex, '(select auth.\1())', 'g');
    if p.qual is not null and p.with_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', p.policyname, p.schemaname, p.tablename, v_using, v_check);
    elsif p.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, v_using);
    else
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, v_check);
    end if;
  end loop;
end $$;
