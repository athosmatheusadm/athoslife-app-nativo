-- ATHOSlife — expansão de suplementos (2026-09-24)
--
-- Base de ~30 suplementos tinha só um punhado de marcas (Growth, Max
-- Titanium, Integralmedica, Dux) e faltavam categorias inteiras que já
-- apareciam no mockup do usuário (Pré-treino, por exemplo). Adiciona ~85
-- produtos de marcas brasileiras reais e populares hoje (Black Skull,
-- Probiótica, Atlhetica Nutrition, Under Labz, Nitech Nutrition, New
-- Millen, Vitafor, Nutrata, Dark Lab, Puravida), cobrindo Whey/Creatina/
-- BCAA/Hipercalórico (mais marcas) + Glutamina/Pré-treino/Multivitamínico/
-- Ômega 3/Colágeno/ZMA/Cafeína (categorias novas).
--
-- Macros são valores TÍPICOS por tipo de produto (mesmo padrão já usado
-- nos ~30 suplementos existentes — não são rótulos exatos de embalagem
-- verificados um a um, mas representativos da faixa real do produto).

insert into public.alimentos (nome, porcao_g, calorias, proteina, carboidrato, gordura, categoria) values
  -- Whey (concentrado/isolado/hidrolisado, porção padrão 30g)
  ('Whey Black Skull concentrado', 30, 120, 22, 4, 2, 'suplemento'),
  ('Whey Black Skull isolado', 30, 110, 25, 1, 0.5, 'suplemento'),
  ('Whey Black Skull hidrolisado', 30, 116, 25, 2, 0.5, 'suplemento'),
  ('Whey Probiótica concentrado', 30, 118, 21, 4, 2, 'suplemento'),
  ('Whey Probiótica isolado', 30, 112, 25, 2, 0.5, 'suplemento'),
  ('Whey Probiótica hidrolisado', 30, 115, 25, 2, 0.5, 'suplemento'),
  ('Whey Atlhetica concentrado', 30, 120, 22, 3, 2, 'suplemento'),
  ('Whey Atlhetica isolado', 30, 110, 25, 1, 0.5, 'suplemento'),
  ('Whey Atlhetica hidrolisado', 30, 115, 25, 2, 0.5, 'suplemento'),
  ('Whey Under Labz concentrado', 30, 122, 23, 3, 2, 'suplemento'),
  ('Whey Under Labz isolado', 30, 112, 26, 1, 0.5, 'suplemento'),
  ('Whey Under Labz hidrolisado', 30, 116, 26, 1, 0.5, 'suplemento'),
  ('Whey Nitech Nutrition concentrado', 30, 118, 22, 4, 2, 'suplemento'),
  ('Whey New Millen concentrado', 30, 120, 21, 4, 2, 'suplemento'),
  ('Whey Vitafor concentrado', 30, 115, 24, 2, 1.5, 'suplemento'),
  ('Whey Nutrata concentrado', 30, 118, 22, 4, 2, 'suplemento'),
  ('Whey Adaptogen concentrado', 30, 120, 21, 4, 2, 'suplemento'),
  ('Whey Dark Lab isolado', 30, 110, 26, 1, 0.5, 'suplemento'),

  -- Creatina monohidratada (porção padrão 3g)
  ('Creatina monohidratada Black Skull', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Probiótica', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Atlhetica', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Under Labz', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Nitech Nutrition', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada New Millen', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Vitafor', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Nutrata', 3, 0, 0, 0, 0, 'suplemento'),
  ('Creatina monohidratada Dark Lab', 3, 0, 0, 0, 0, 'suplemento'),

  -- BCAA em pó (porção padrão 10g)
  ('BCAA Black Skull', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Probiótica', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Atlhetica', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Under Labz', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Nitech Nutrition', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA New Millen', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Vitafor', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Nutrata', 10, 35, 7, 0, 0, 'suplemento'),
  ('BCAA Max Titanium', 10, 35, 7, 0, 0, 'suplemento'),

  -- Glutamina (categoria nova, porção padrão 5g)
  ('Glutamina Growth', 5, 0, 0, 0, 0, 'suplemento'),
  ('Glutamina Max Titanium', 5, 0, 0, 0, 0, 'suplemento'),
  ('Glutamina Integralmedica', 5, 0, 0, 0, 0, 'suplemento'),
  ('Glutamina Dux', 5, 0, 0, 0, 0, 'suplemento'),
  ('Glutamina Probiótica', 5, 0, 0, 0, 0, 'suplemento'),
  ('Glutamina Atlhetica', 5, 0, 0, 0, 0, 'suplemento'),

  -- Pré-treino (categoria nova, porção padrão 10g)
  ('Pré-treino Growth', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Max Titanium', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Integralmedica Adrenaline', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Probiótica Explode', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Atlhetica Evo', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Under Labz Horus', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Black Skull Hardcore', 10, 15, 0, 3, 0, 'suplemento'),
  ('Pré-treino Dux', 10, 15, 0, 3, 0, 'suplemento'),

  -- Hipercalórico (porção padrão 100g)
  ('Hipercalórico Black Skull', 100, 400, 20, 70, 6, 'suplemento'),
  ('Hipercalórico Probiótica', 100, 390, 18, 68, 6, 'suplemento'),
  ('Hipercalórico Atlhetica', 100, 400, 20, 70, 6, 'suplemento'),
  ('Hipercalórico Under Labz', 100, 410, 22, 68, 7, 'suplemento'),
  ('Hipercalórico Nitech Nutrition', 100, 390, 19, 68, 6, 'suplemento'),
  ('Hipercalórico Vitafor', 100, 380, 20, 65, 5, 'suplemento'),

  -- Multivitamínico (categoria nova, porção nominal 1 comprimido ~1g)
  ('Multivitamínico Growth', 1, 4, 0, 1, 0, 'suplemento'),
  ('Multivitamínico Max Titanium', 1, 4, 0, 1, 0, 'suplemento'),
  ('Multivitamínico Integralmedica', 1, 4, 0, 1, 0, 'suplemento'),
  ('Multivitamínico Vitafor', 1, 4, 0, 1, 0, 'suplemento'),
  ('Multivitamínico Probiótica', 1, 4, 0, 1, 0, 'suplemento'),

  -- Ômega 3 (categoria nova, porção nominal 1 cápsula ~1g)
  ('Ômega 3 Growth', 1, 9, 0, 0, 1, 'suplemento'),
  ('Ômega 3 Vitafor', 1, 9, 0, 0, 1, 'suplemento'),
  ('Ômega 3 Integralmedica', 1, 9, 0, 0, 1, 'suplemento'),
  ('Ômega 3 Puravida', 1, 9, 0, 0, 1, 'suplemento'),

  -- Colágeno (categoria nova, porção padrão 10g)
  ('Colágeno Growth', 10, 35, 9, 0, 0, 'suplemento'),
  ('Colágeno Vitafor', 10, 35, 9, 0, 0, 'suplemento'),
  ('Colágeno Integralmedica', 10, 35, 9, 0, 0, 'suplemento'),
  ('Colágeno Probiótica', 10, 35, 9, 0, 0, 'suplemento'),

  -- ZMA (categoria nova, porção nominal 3 cápsulas ~1.5g)
  ('ZMA Growth', 1.5, 5, 0, 0, 0, 'suplemento'),
  ('ZMA Max Titanium', 1.5, 5, 0, 0, 0, 'suplemento'),
  ('ZMA Integralmedica', 1.5, 5, 0, 0, 0, 'suplemento'),

  -- Cafeína (categoria nova, porção nominal 1 cápsula ~0.3g)
  ('Cafeína Growth', 0.3, 0, 0, 0, 0, 'suplemento'),
  ('Cafeína Max Titanium', 0.3, 0, 0, 0, 0, 'suplemento'),
  ('Cafeína Integralmedica', 0.3, 0, 0, 0, 0, 'suplemento'),

  -- Albumina (porção padrão 30g)
  ('Albumina em pó Growth', 30, 110, 24, 2, 0, 'suplemento'),
  ('Albumina em pó Probiótica', 30, 108, 23, 2, 0, 'suplemento'),
  ('Albumina em pó Dux', 30, 110, 24, 2, 0, 'suplemento'),

  -- Maltodextrina / Dextrose (porção padrão 30g)
  ('Maltodextrina Growth', 30, 114, 0, 28.5, 0, 'suplemento'),
  ('Maltodextrina Max Titanium', 30, 114, 0, 28.5, 0, 'suplemento'),
  ('Dextrose Growth', 30, 114, 0, 28.5, 0, 'suplemento'),
  ('Dextrose Probiótica', 30, 114, 0, 28.5, 0, 'suplemento'),

  -- Beta alanina (porção padrão 3g)
  ('Beta alanina em pó Growth', 3, 0, 0, 0, 0, 'suplemento'),
  ('Beta alanina em pó Max Titanium', 3, 0, 0, 0, 0, 'suplemento'),
  ('Beta alanina em pó Integralmedica', 3, 0, 0, 0, 0, 'suplemento');
