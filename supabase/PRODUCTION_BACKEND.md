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

Desde a migração `017_atomic_operational_commands.sql`, o navegador envia os IDs
estáveis do snapshot e o banco resolve os UUIDs internos. As RPCs de atribuição,
liberação, concessão, uso, arquivamento e decisão de solicitações executam a
alteração e a auditoria na mesma transação. Aprovar um pedido e atribuir a vaga é
uma única operação: se qualquer etapa falhar, nenhuma delas é gravada.

A migração `018_spot_lifecycle_and_module_reconciliation.sql` acrescenta o ciclo
de vida das vagas. Uma estrutura substituída deixa de aceitar novos vínculos,
mas suas vagas e alocações encerradas permanecem disponíveis para auditoria. A
mesma migração completa automaticamente o identificador técnico do módulo quando
o nome do setor corresponde de forma inequívoca a um módulo configurado.

A migração `019_public_spot_qr_identity.sql` separa a identidade física da vaga
do número exibido. A plaqueta usa um UUID público estável, portanto números iguais
em módulos diferentes não se confundem. A consulta anônima não devolve nome,
unidade, telefone, e-mail ou chassi do morador.

## Implantação segura

1. Faça backup do snapshot do piloto.
2. Execute as migrações `001` a `019` em ordem no SQL Editor do Supabase.
3. Valide os comandos RPC com uma conta de síndico e outra de portaria.
4. Confirme que `backend_integrity_check.sql` retorna zero em
   `unexpected_direct_write_policies`, `retired_active_allocations` e nas três
   verificações de duplicidade.
5. Trate `condominium_snapshots` como cache/compatibilidade; vínculos ativos são
   protegidos pelas tabelas operacionais e pelas RPCs.

## Regra de segurança

Nunca use a chave `service_role` no Vercel ou no navegador. O cliente utiliza
somente `VITE_SUPABASE_ANON_KEY`; permissões são aplicadas pelas políticas RLS e
pelas funções do banco.
