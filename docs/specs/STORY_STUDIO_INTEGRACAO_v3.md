# ATHOS Story Studio 3.0 — Integração com o app (Capacitor) e com o Instagram

Este guia acompanha `ATHOS_Story_Editor_Unificado_V3.html` e a pasta `capacitor/`.

O editor vira uma página do próprio app Capacitor. O app abre essa página já com os dados do treino ou da refeição. Quando o usuário toca em **Postar nos Stories**, um plugin nativo abre o Instagram com a imagem carregada no editor de Stories; o usuário só confirma.

## 1. Arquivos

| Arquivo | Vai para |
|---|---|
| `ATHOS_Story_Editor_Unificado_V3.html` | `public/story/index.html` (ou a pasta pública do seu build web) |
| `capacitor/web/athos-story.ts` | Código web do app (ex.: `src/lib/athos-story.ts`) |
| `capacitor/android/AthosInstagramPlugin.java` | `android/app/src/main/java/<seu/pacote>/plugins/` |
| `capacitor/android/MainActivity.java` | Substitui o `MainActivity.java` atual (mantenha o seu pacote) |
| `capacitor/ios/AthosInstagramPlugin.swift` | `ios/App/App/` (adicione ao target App no Xcode) |
| `capacitor/ios/MainViewController.swift` | `ios/App/App/` |

Ajuste a linha `package` dos arquivos Java para o pacote do app.

## 2. Configuração

### Facebook App ID (obrigatório)

A Meta exige um App ID para o Sharing to Stories desde janeiro de 2023. Sem ele, o Instagram mostra um erro dizendo que o app de origem não suporta compartilhamento nos Stories.

1. Crie um app em developers.facebook.com e copie o App ID.
2. Em `capacitor.config.ts`:

```ts
const config: CapacitorConfig = {
  // ...
  plugins: {
    AthosInstagram: { facebookAppId: 'SEU_FACEBOOK_APP_ID' },
  },
};
```

3. Rode `npx cap sync`.

No iOS, o plugin também aceita a chave `FacebookAppID` no `Info.plist` como reserva, caso a configuração acima não seja lida.

### Android

- **`MainActivity.java`:** registra o plugin antes do `super.onCreate`.
- **`AndroidManifest.xml`:** dentro de `<manifest>`, adicione o bloco abaixo. Sem ele, o Android 11+ esconde o Instagram do app.

```xml
<queries>
  <package android:name="com.instagram.android" />
</queries>
```

- **FileProvider:** o template do Capacitor já declara `${applicationId}.fileprovider`. Confira se `res/xml/file_paths.xml` tem `<cache-path name="my_cache_images" path="." />`. Se não tiver, adicione.

### iOS

- **`Info.plist`:**

```xml
<key>LSApplicationQueriesSchemes</key>
<array><string>instagram-stories</string></array>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Para salvar seus stories na galeria.</string>
```

- **`Main.storyboard`:** selecione o Bridge View Controller e troque a classe para `MainViewController`. É ele que registra o plugin local.

## 3. Abrir o editor com os dados

```ts
import { openStory, photoFromFile } from './lib/athos-story';

openStory({ mode: 'run', values: { distance: 10.05, time: 3125, elevation: 82 } });

openStory({
  mode: 'food',
  values: { kcal: 612, protein: 38, carbs: 70, fat: 18 },
  options: { estimated: true, photo: photoFromFile(fotoDoScannerUri) },
});
```

`openStory` guarda os dados na `sessionStorage` e navega para o editor. O editor lê, apaga e aplica. O botão de voltar no topo retorna à tela anterior.

Use `photoFromFile` para fotos locais (Camera, Filesystem). Ele gera uma URL do próprio app, então a exportação não é bloqueada. Uma foto `https:` de outro domínio só exporta se o servidor permitir CORS.

### Campos por modalidade

Números são formatados no padrão brasileiro pelo editor. Textos aparecem como vieram, até 90 caracteres. Só os campos enviados aparecem.

| Modo | Campos | Observações |
|---|---|---|
| `gym` | `pr`, `evolution`, `focus`, `volume`, `sets`, `intensity`, `blocks` | `pr` pode ser `{ kg: 132.5, exercise: 'Supino reto' }`; `evolution` em kg; `blocks` = volumes por bloco (até 10) |
| `run` | `distance` (km), `time` (s), `pace` (s/km), `elevation` (m), `kcal` | Sem `pace`, o ritmo é calculado de distância e tempo |
| `food` | `kcal`, `protein`, `carbs`, `fat`, `cook` (min) | `estimated: true` mostra "≈". Use sempre para dados do scanner |
| `jiujitsu` | `rounds`, `matTime` (s), `focus`, `heart`, `kcal`, `beltColor`, `beltDegrees` | `beltColor`: hexadecimal ou `'coral'`. Graus: coloridas até 4, preta até 6 |

`options.labels` troca rótulos, por exemplo `{ kcal: 'Energia' }`. `options.source` muda o selo de origem.

## 4. Postar nos Stories

O editor detecta o plugin `AthosInstagram` sozinho; não há configuração no lado web.

| Situação | O que acontece |
|---|---|
| Instagram instalado | Abre o editor de Stories com a imagem 1080×1920. O usuário confirma |
| Instagram não instalado | O editor oferece "Salvar ou compartilhar" (menu do sistema) |
| App ID ausente | Mesma oferta, com aviso de que o envio direto não está configurado |
| Botão de download | Abre o menu do sistema: salvar na galeria, WhatsApp, Feed etc. |
| Fora do app (navegador) | Usa o menu de compartilhar do navegador ou baixa a imagem |

Para acompanhar o resultado no app, escute os eventos do editor:

```ts
window.addEventListener('athos-story:shareResult', (e: any) => {
  // e.detail = { ok: boolean, channel: 'instagram' | 'system', reason?: string }
});
```

Outros eventos: `athos-story:ready`, `athos-story:activityOpened`, `athos-story:closed`.

## 5. Checklist de teste em aparelho real

- [ ] Cada modalidade abre com dados reais; nenhum número de exemplo aparece.
- [ ] Alimentação vinda do scanner mostra "≈".
- [ ] Foto local via `photoFromFile` aparece e exporta.
- [ ] Android com Instagram: abre o editor de Stories com a imagem.
- [ ] iOS com Instagram: idem.
- [ ] Sem Instagram: aparece "Salvar ou compartilhar" e o menu do sistema abre.
- [ ] iOS: "Salvar imagem" no menu pede permissão da galeria e salva.
- [ ] App ID errado: conferir a mensagem do Instagram antes de publicar o app.
- [ ] Layout lembrado entre dois stories da mesma modalidade; "Esquecer meu layout" volta ao padrão.
- [ ] Botão voltar retorna à tela de origem.

## 6. Limitações conhecidas

- **Life Jiu-Jitsu:** a imagem do arquivo V2 estava corrompida (só o topo da cabeça existia). O V3 usa o Life de musculação no lugar. Para trocar, substitua `ASSETS.jiujitsuLife` no HTML ou chame `ATHOSStory.setAsset('jiujitsuLife', url)`.
- **Cores do Life:** fixas, sem opção de alterar.
- **Vídeo:** funciona na prévia, mas o story sai como imagem do quadro atual.
- **Rascunho:** o layout é lembrado, mas a edição em andamento não sobrevive se o sistema fechar o app.
- **Plugin:** escrito para Capacitor 6 ou 7. Em versões anteriores, o registro no iOS é diferente.

## 7. Outras WebViews (opcional)

Se o editor for usado fora do Capacitor, ele também conversa por `ReactNativeWebView.postMessage`, `webkit.messageHandlers.athos` ou `window.AthosAndroid.postMessage`, desde que o app declare `window.ATHOS_NATIVE = { capabilities: ['instagramStories'] }`. Nesse caso o editor envia `{ type: 'shareToInstagramStory', imageBase64 }` e o app responde com `ATHOSStory.nativeResult({ type: 'shareResult', ok, reason })`.

Referência: Meta, Sharing to Stories — https://developers.facebook.com/docs/instagram-platform/sharing-to-stories
