-- Tetos de registro (revisão de 26/10: 999.999 g de arroz viraram
-- 1.653.332 kcal e estragaram gráficos e metas). O app trava antes
-- (src/domain/rules/limites.ts: 5 kg por item, 5 L de água por registro);
-- isto é a mesma trava no banco, pra nenhum caminho passar.
-- Conferido antes: nenhum registro atual fora desses limites.

alter table public.itens_refeicao
  add constraint itens_refeicao_valores_razoaveis check (
    calorias between 0 and 50000
    and proteina between 0 and 5000
    and carboidrato between 0 and 5000
    and gordura between 0 and 5000
  );

alter table public.registros_agua
  add constraint registros_agua_quantidade_max check (quantidade_ml <= 5000);
