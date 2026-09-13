# Backend de produção

## Estado atual

O piloto grava a visão completa do condomínio em `condominium_snapshots` e mantém
registros operacionais em `spot_requests`. Isso permite teste entre dispositivos,
mas a última gravação de snapshot vence quando dois gestores editam em paralelo.

## Nova camada transacional

A migração `009_production_operations.sql` estabelece as tabelas normalizadas
como fonte de verdade para a operação:

- `bicycle_spots`: vagas físicas;
- `bicycles`: bicicletas e responsável;
- `allocations`: vínculo ativo ou encerrado entre bicicleta e vaga;
- `audit_logs`: trilha de decisões;
- `storage.objects` no bucket privado `bike-photos`: fotos de bicicleta.

As funções RPC `assign_bicycle_to_spot` e `release_spot_allocation` executam a
alteração e a auditoria na mesma transação. Elas verificam o papel do usuário,
o condomínio dos registros e bloqueiam as linhas envolvidas antes de decidir.

## Implantação segura

1. Faça backup do snapshot do piloto.
2. Execute as migrações `001` a `009` em ordem no SQL Editor do Supabase.
3. Valide os comandos RPC com uma conta de síndico e outra de portaria.
4. Migre a interface de vínculos para `src/lib/operations.ts`.
5. Só então trate `condominium_snapshots` como cache/backup, e não como fonte primária.

## Regra de segurança

Nunca use a chave `service_role` no Vercel ou no navegador. O cliente utiliza
somente `VITE_SUPABASE_ANON_KEY`; permissões são aplicadas pelas políticas RLS e
pelas funções do banco.
