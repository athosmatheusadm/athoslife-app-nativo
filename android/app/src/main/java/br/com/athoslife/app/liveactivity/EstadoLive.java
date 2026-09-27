package br.com.athoslife.app.liveactivity;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Estado do card da Live Activity, guardado no aparelho.
 *
 * O app (TypeScript, domain/entities/sessaoTreino.ts) é a fonte da verdade e
 * manda o estado inteiro a cada mudança. Este lado só precisa de uma cópia
 * pra desenhar e pra reagir a um toque quando o app está dormindo — por isso
 * repete as transições simples (steppers, +15s, pular, iniciar, confirmar).
 * Quando o app acorda ele reaplica os mesmos toques e reenvia o estado certo.
 *
 * Campos = EstadoLiveActivity do TS: nomeExercicio, serieAtual, totalSeries,
 * medida (reps|tempo), cargaKg, reps, segundos, status
 * (serie|cronometro|descanso), descansoFimEm, cronometroFimEm (ms epoch),
 * proximo, descansoSeg.
 */
final class EstadoLive {
    private static final String PREFS = "athos_live_activity";
    private static final String CHAVE_ESTADO = "estado";
    private static final String CHAVE_FILA = "fila_acoes";

    final JSONObject json;

    private EstadoLive(JSONObject json) {
        this.json = json;
    }

    static EstadoLive de(String texto) throws JSONException {
        return new EstadoLive(new JSONObject(texto));
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static EstadoLive carregar(Context ctx) {
        String t = prefs(ctx).getString(CHAVE_ESTADO, null);
        if (t == null) return null;
        try {
            return de(t);
        } catch (JSONException e) {
            return null;
        }
    }

    void salvar(Context ctx) {
        prefs(ctx).edit().putString(CHAVE_ESTADO, json.toString()).apply();
    }

    static void limpar(Context ctx) {
        prefs(ctx).edit().remove(CHAVE_ESTADO).apply();
    }

    // ── fila de toques feitos com o app fechado ─────────────────────────────

    static synchronized void enfileirar(Context ctx, String acao) {
        try {
            JSONArray fila = new JSONArray(prefs(ctx).getString(CHAVE_FILA, "[]"));
            fila.put(acao);
            prefs(ctx).edit().putString(CHAVE_FILA, fila.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static synchronized JSONArray drenar(Context ctx) {
        JSONArray fila;
        try {
            fila = new JSONArray(prefs(ctx).getString(CHAVE_FILA, "[]"));
        } catch (JSONException e) {
            fila = new JSONArray();
        }
        prefs(ctx).edit().remove(CHAVE_FILA).apply();
        return fila;
    }

    // ── leitura ─────────────────────────────────────────────────────────────

    String status() {
        return json.optString("status", "serie");
    }

    boolean porTempo() {
        return "tempo".equals(json.optString("medida", "reps"));
    }

    String nome() {
        return json.optString("nomeExercicio", "Treino");
    }

    int serieAtual() {
        return json.optInt("serieAtual", 1);
    }

    int totalSeries() {
        return json.optInt("totalSeries", 1);
    }

    /** null quando não há carga. */
    Double carga() {
        return json.isNull("cargaKg") || !json.has("cargaKg") ? null : json.optDouble("cargaKg");
    }

    int reps() {
        return json.optInt("reps", 0);
    }

    int segundos() {
        return json.optInt("segundos", 30);
    }

    long fimEm() {
        String chave = "descanso".equals(status()) ? "descansoFimEm" : "cronometroFimEm";
        return json.isNull(chave) ? 0L : json.optLong(chave, 0L);
    }

    String proximo() {
        return json.isNull("proximo") ? null : json.optString("proximo", null);
    }

    // ── transições (espelho de sessaoTreino.ts) ─────────────────────────────

    void aplicar(String acao, long agora) {
        try {
            switch (acao) {
                case "carga+": ajustarCarga(2.5); break;
                case "carga-": ajustarCarga(-2.5); break;
                case "reps+": json.put("reps", reps() + 1); break;
                case "reps-": json.put("reps", Math.max(0, reps() - 1)); break;
                case "seg+": json.put("segundos", segundos() + 5); break;
                case "seg-": json.put("segundos", Math.max(5, segundos() - 5)); break;
                case "descanso+15":
                    if ("descanso".equals(status())) {
                        json.put("descansoFimEm", Math.max(fimEm(), agora) + 15_000L);
                    }
                    break;
                case "pular":
                    if ("descanso".equals(status())) {
                        json.put("status", "serie");
                        json.put("descansoFimEm", JSONObject.NULL);
                    }
                    break;
                case "iniciar":
                    if ("serie".equals(status()) && porTempo()) {
                        json.put("status", "cronometro");
                        json.put("cronometroFimEm", agora + segundos() * 1000L);
                    }
                    break;
                case "confirmar":
                    if ("serie".equals(status()) || "cronometro".equals(status())) {
                        // O app decide o próximo exercício de verdade quando acordar;
                        // aqui só avança a série e começa o descanso.
                        json.put("serieAtual", Math.min(serieAtual() + 1, totalSeries()));
                        json.put("status", "descanso");
                        json.put("cronometroFimEm", JSONObject.NULL);
                        json.put("descansoFimEm", agora + json.optInt("descansoSeg", 90) * 1000L);
                    }
                    break;
                default:
                    break;
            }
        } catch (JSONException ignored) {
        }
    }

    /** Descanso/cronômetro que acabou: volta pra série (o app grava a série do cronômetro). */
    boolean avancarRelogio(long agora) {
        long fim = fimEm();
        if (fim <= 0 || agora < fim) return false;
        try {
            if ("descanso".equals(status())) {
                json.put("status", "serie");
                json.put("descansoFimEm", JSONObject.NULL);
                return true;
            }
            if ("cronometro".equals(status())) {
                aplicar("confirmar", fim);
                return true;
            }
        } catch (JSONException ignored) {
        }
        return false;
    }

    private void ajustarCarga(double delta) throws JSONException {
        double atual = carga() == null ? 0 : carga();
        double nova = Math.max(0, Math.round((atual + delta) * 10) / 10.0);
        if (nova == 0 && delta < 0) json.put("cargaKg", JSONObject.NULL);
        else json.put("cargaKg", nova);
    }
}
