# Migração para Capacitor 8 — feito e o que resta

Este projeto foi migrado de Capacitor 6 para **Capacitor 8**. Abaixo, o que já
está feito no código e os poucos passos manuais que o dev precisa rodar (por
causa de limitação de rede no ambiente onde a migração foi preparada — não deu
para rodar `npm install` para travar as versões exatas).

## Já feito neste repositório

- `package.json`: todos os `@capacitor/*` atualizados para `^8.0.0`.
- `package.json`: `engines.node` = `>=20` (requisito do Cap 8).
- `android/variables.gradle`: `minSdk 23`, `compileSdk 35`, `targetSdk 35`, e
  bibliotecas androidx atualizadas (requisitos do Cap 8).
- Java 17 já configurado no Gradle (Cap 8 exige 17+).
- GitHub Actions já usa Node 22 e Java 21 (compatíveis).

## Passos que o dev roda no primeiro setup (ambiente com rede normal)

```bash
# 1. Instalar as dependências já atualizadas
npm install

# 2. Deixar o npm resolver a versão EXATA e compatível dos pacotes Capacitor 8
#    (garante que core, cli, android e plugins fiquem na mesma versão)
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest \
            @capacitor/app@latest @capacitor/camera@latest @capacitor/haptics@latest \
            @capacitor/preferences@latest @capacitor/splash-screen@latest \
            @capacitor/status-bar@latest

# 3. Adicionar o plugin de saúde (passos automáticos) — agora possível no Cap 8
npm install @capgo/capacitor-health@latest

# 4. Remover o stub de tipos, que só existia porque o plugin estava fora
rm types/capgo-health.d.ts

# 5. Sincronizar o projeto nativo
npx cap sync android

# 6. Validar
npx tsc --noEmit         # deve dar 0 erros
```

## Sobre o stub de tipos (`types/capgo-health.d.ts`)

Enquanto o plugin `@capgo/capacitor-health` estava FORA do projeto (impossível no
Cap 6), esse arquivo declarava os tipos do `Health` só para o TypeScript compilar.
Assim que o pacote real entrar (passo 3), **apague o stub** (passo 4) — o pacote
traz os tipos de verdade, e manter os dois causa conflito.

## Teste do Health Connect

Depois disso, os passos automáticos passam a funcionar. Lembre que **ler dado de
saúde exige aprovação da Google** para publicar (ver `HEALTH_CONNECT_DIRETRIZ.md`).
No desenvolvimento e teste no aparelho, funciona sem a aprovação.
