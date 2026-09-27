-- ATHOSlife — foto de perfil (2026-09-24)
--
-- Coluna nova + bucket público de avatares. Bucket público (URL direta,
-- sem assinatura) porque é foto de perfil, não dado sensível como as
-- progress-photos (essas continuam privadas). Caminho do arquivo é
-- avatars/<user_id>/<arquivo> — a policy de escrita trava pelo primeiro
-- segmento do caminho ser o próprio auth.uid(), padrão já documentado do
-- Supabase pra bucket de avatar.

alter table public.profiles add column if not exists avatar_url text;

-- altura_cm, idade e peso_atual já existiam na tabela (nunca usados pelo
-- app até agora — conferido, sem código lendo/escrevendo essas colunas).
-- sexo é novo.
alter table public.profiles add column if not exists sexo text
  check (sexo is null or sexo = any (array['masculino', 'feminino', 'outro', 'prefiro_nao_dizer']));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
