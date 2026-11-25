// ================================================================
// TABELA DE COMPOSIÇÃO POR PAÍS (24/11) — o dono: "os alimentos desses
// outros países sejam passados por suas organizações, Brasil TACO, inglês
// USDA e assim por diante, pra termos mais assertividade".
// É a referência que o Life cita nos prompts (estimativa no chat, foto,
// receitas, cultura). O app NÃO consulta essas bases ao vivo: o modelo
// estima usando a tabela oficial do país como referência.
// ================================================================

const TABELAS: Record<string, string> = {
  BR: 'tabela TACO (Tabela Brasileira de Composição de Alimentos, NEPA/Unicamp) ou a TBCA (USP)',
  PT: 'Tabela da Composição de Alimentos do INSA (Instituto Nacional de Saúde Doutor Ricardo Jorge, Portugal)',
  US: 'USDA FoodData Central',
  CA: 'Canadian Nutrient File (Health Canada)',
  GB: "UK CoFID (McCance and Widdowson's The Composition of Foods)",
  IE: "UK CoFID (McCance and Widdowson's), usada na Irlanda",
  ES: 'BEDCA (Base de Datos Española de Composición de Alimentos)',
  MX: 'Tablas de Composición de Alimentos del INCMNSZ e o Sistema Mexicano de Alimentos Equivalentes (SMAE)',
  AR: 'ARGENFOODS (Tabla de Composición de Alimentos de Argentina, Universidad Nacional de Luján)',
  UY: 'tabela de composição de alimentos do Uruguai (MSP) ou ARGENFOODS',
  CL: 'Tabla de Composición de Alimentos de Chile (INTA, Universidad de Chile)',
  CO: 'Tabla de Composición de Alimentos Colombianos (ICBF)',
  PE: 'Tablas Peruanas de Composición de Alimentos (CENAN/INS)',
  FR: 'table Ciqual (ANSES)',
  BE: 'table Ciqual (ANSES) ou NUBEL (Bélgica)',
  DE: 'Bundeslebensmittelschlüssel (BLS, Max Rubner-Institut)',
  AT: 'Bundeslebensmittelschlüssel (BLS)',
  IT: 'Tabelle di Composizione degli Alimenti (CREA)',
  NL: 'NEVO (Nederlands Voedingsstoffenbestand, RIVM)',
  IN: 'Indian Food Composition Tables (IFCT 2017, ICMR-NIN)',
  JP: 'Standard Tables of Food Composition in Japan (MEXT)',
  AU: 'Australian Food Composition Database (FSANZ)',
  NZ: 'New Zealand Food Composition Database (Plant & Food Research)',
  ZA: 'SAFOODS (South African Medical Research Council)',
}

const GENERICA = 'tabela nacional de composição de alimentos do país (ou a regional da FAO/INFOODS; na falta, USDA FoodData Central)'

/** Nome da tabela oficial de referência para o país (ISO-3166 alfa-2). */
export function tabelaDoPais(pais: string | null | undefined, idioma?: string | null): string {
  const p = (pais ?? '').toUpperCase()
  if (TABELAS[p]) return TABELAS[p]
  if (!p && (idioma === 'pt-BR' || !idioma)) return TABELAS.BR
  if (!p && idioma === 'pt-PT') return TABELAS.PT
  return GENERICA
}
