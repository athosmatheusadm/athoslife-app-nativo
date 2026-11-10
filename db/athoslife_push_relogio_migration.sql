-- ATHOSlife — relógio do push do Life (2026-11-09)
--
-- Aplicar SÓ depois de: athoslife_push_life_migration.sql aplicada, função
-- life-push publicada (--no-verify-jwt) e Secret FIREBASE_SERVICE_ACCOUNT
-- no Supabase. A cada 15 min o pg_cron chama a função com a senha do Vault.
--
-- Desligar: select cron.unschedule('life-push');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'life-push';

select cron.schedule(
  'life-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://gsdwsxwbmxcvutpvpkyi.supabase.co/functions/v1/life-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-relogio', (select decrypted_secret from vault.decrypted_secrets where name = 'life_push_relogio')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
