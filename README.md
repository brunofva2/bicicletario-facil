# Bicicletário Fácil

Sistema da Nobrutec para organizar a operação de bicicletários em condomínios:
planta baixa, vagas, bicicletas, concessões, tarefas, irregularidades e auditoria.

## O que o aplicativo faz hoje

| Área | Uso principal |
| --- | --- |
| Painel | Mostra a próxima ação e o resumo operacional do condomínio. |
| Mapa de vagas | Exibe a planta, ocupação, vagas livres e detalhes de cada posição. |
| Cadastro de bicicletas | Centraliza morador, apartamento, bicicleta, foto, selo e vínculo de vaga. |
| Solicitações | Registra pedidos de vaga, ocorrências, vistorias e regularizações. |
| Tarefas e pendências | Separa fila de vagas, reavaliações e irregularidades. |
| Histórico | Mantém os registros de movimentação da operação. |
| Configurações | Permite configurar setores, módulos, regras e planta operacional. |

## Perfis de acesso

- **Nobrutec:** administra condomínios e acessos de suporte.
- **Síndico:** pode cadastrar, editar, vincular, liberar e decidir solicitações do seu condomínio.
- **Portaria / staff:** consulta os dados e registra solicitações; não altera vagas diretamente.
- **Visitante:** navega pela demonstração sem gravar alterações.

## Dados e armazenamento

Durante o piloto, o app mantém duas cópias dos dados:

1. **Navegador:** cache local para abertura rápida e uso temporariamente offline.
2. **Supabase:** cópia do condomínio em `condominium_snapshots`, para abrir os mesmos dados em outro dispositivo.

O backend está em transição para registros normalizados:

- `bicycle_spots`: vagas físicas;
- `bicycles`: bicicletas e responsável;
- `allocations`: vínculo entre vaga e bicicleta;
- `spot_requests`: solicitações, ocorrências e regularizações;
- `audit_logs`: trilha de decisões;
- `bike-photos`: armazenamento privado de fotos.

## Estrutura correta das vagas

O número visível não identifica uma vaga quando há módulos distintos. A identidade
operacional é:

```text
Condomínio + módulo da planta + número da vaga
```

Exemplo:

```text
Setor A · SUSPE-01
Setor B · SUSPE-01
Setor C · SUSPE-01
```

Essas são três vagas diferentes, mesmo com o mesmo número mostrado no card.

## Observações e limites atuais

### Edição simultânea

**Situação atual:** dois síndicos editando a planta ao mesmo tempo ainda podem
causar o cenário “a última alteração vence”, pois o piloto grava um snapshot
completo.

**Exemplo:** um síndico cadastra uma bicicleta enquanto outro libera uma vaga;
se ambos salvarem ao mesmo tempo, uma alteração pode sobrescrever a outra.

**Evolução em curso:** vínculos e liberações passarão pelas funções transacionais
do banco, que bloqueiam a vaga durante a decisão.

### Trabalho sem sinal

**Situação atual:** o aplicativo mantém uma fila offline no `IndexedDB` do
celular. Cadastro e alterações continuam visíveis localmente quando não há rede.

**Exemplo:** o porteiro cadastra uma bicicleta no subsolo sem sinal. A alteração
fica marcada como aguardando envio e é sincronizada quando o aparelho reconectar.

**Proteção:** o Supabase compara a versão local com a versão da nuvem. Caso outro
gestor tenha alterado o mesmo condomínio, o app sinaliza conflito e não sobrescreve
dados automaticamente.

Ao reabrir o aplicativo, a cópia pendente é restaurada na tela antes do envio.
Cada item da fila possui uma revisão própria, evitando que a confirmação de um
envio antigo remova uma alteração mais recente. Em conflitos, o usuário pode
baixar a cópia local antes de optar explicitamente pela versão da nuvem.

Vínculos, liberações, concessões e decisões de solicitações continuam online:
essas ações dependem de bloqueios transacionais para impedir duas pessoas de
ocuparem a mesma vaga.

### Fotos de bicicletas

**Situação atual:** fotos podem estar dentro do snapshot do navegador.

**Exemplo:** muitas fotos em alta resolução deixam a sincronização mais pesada.

**Evolução em curso:** novas fotos irão para o bucket privado `bike-photos` do
Supabase, mantendo apenas a URL no cadastro.

### Vínculos antigos sem bicicleta relacionada

**Situação atual:** há três vagas antigas ocupadas sem `bicycleId`:
`S-04`, `S-10` e `S-12`.

**Evolução em curso:** a migração preserva essas ocupações criando registros de
recuperação auditáveis, marcados para revisão, em vez de associar uma bicicleta
por suposição.

### Notificações externas

**Situação atual:** os botões de comunicação ajudam a montar a ação, mas não há
automação server-side de WhatsApp ou e-mail configurada.

**Exemplo:** uma reavaliação pode ser preparada no app, porém o envio automático
para vários moradores exigirá uma integração oficial posterior.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para validação de tipos:

```bash
npm run lint
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e informe apenas as chaves públicas:

```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-publica"
```

Nunca coloque a chave `service_role` no navegador, no Vercel ou no repositório.

## Migrações Supabase

Execute as migrações em ordem no SQL Editor. As fases relevantes são:

1. `001` a `008`: autenticação, permissões, snapshots e tarefas.
2. `009_production_operations.sql`: regras transacionais, auditoria e storage privado.
3. `010` a `012`: etapas preparatórias da importação do piloto.
4. `013_final_snapshot_migration.sql`: correção definitiva para vagas repetidas entre módulos e recuperação de vínculos antigos.
5. `014_offline_snapshot_sync.sql`: fila offline com versão e detecção de conflito.
6. `015` e `016`: normalização dos módulos e sincronização dinâmica da planta com as vagas operacionais.
7. `017_atomic_operational_commands.sql`: vínculos, liberações, concessões, uso e decisões de solicitações atômicas; execute antes de usar esta versão do frontend na nuvem.
8. `018_spot_lifecycle_and_module_reconciliation.sql`: normaliza o módulo técnico das vagas, aposenta estruturas substituídas e conserva vínculos encerrados no histórico.
9. `019_public_spot_qr_identity.sql`: faz cada QR apontar para o UUID público estável da vaga física e limita a consulta anônima a dados não pessoais.

Antes de uma migração de dados, faça backup do `payload` em
`condominium_snapshots` e valide primeiro no condomínio de teste.

## Onde alterar cada parte do app

| Necessidade | Arquivo principal |
| --- | --- |
| Regras e estado da operação | `src/App.tsx` |
| Tipos de dados | `src/types.ts` |
| Autenticação e visitante | `src/auth/AuthGate.tsx` |
| Sincronização na nuvem | `src/hooks/useCloudSnapshot.ts` |
| Operações seguras de vaga | `src/lib/operations.ts` |
| Banco e permissões | `supabase/schema.sql` e `supabase/migrations/` |
| Mapa e planta | `src/components/SpotMap.tsx` e componentes de planta |
| Cadastro de bicicletas | `src/components/BikeCatalogView.tsx` e `BikeRegisterModal.tsx` |

## Checklist antes de publicar

### Auditoria — Grupo 1: identidade e isolamento local

- Vínculos usam o ID da bicicleta e da vaga; nome, apartamento e número visível não identificam um vínculo sozinhos. Duas bicicletas do mesmo apartamento continuam independentes.
- A regeneração mantém IDs por módulo/posição e recusa remover vagas ocupadas no modo de preservação. Capacidades diferentes e acima de 24 vagas são suportadas.
- Cache local em `bicicletario:workspace:v2:...`, separado por usuário e condomínio. O visitante lê somente a demonstração e não grava esse cache.
- As antigas chaves globais `condo_*_v1` são preservadas, mas não são importadas automaticamente para contas na nuvem: elas não comprovam a qual condomínio pertencem. Antes de publicar para usuários com alterações locais antigas, exporte um backup no ambiente anterior e confira o condomínio antes de restaurar. Não limpe o armazenamento do navegador para migrar.
- Esta etapa não exige SQL. A integração transacional com as tabelas operacionais, RLS e a revisão completa de concorrência/fila offline permanecem em etapas posteriores. O isolamento do cache não equivale a criptografia nem substitui autorização no servidor.

Verificação local: `npm test` executa regressões de identidade, cache e componentes React em DOM simulado; `npm run lint` verifica TypeScript; `npm run build` gera a versão de produção. Os testes não acessam nem alteram o Supabase real.

Exemplo de alteração ainda não automatizada: remover um módulo ocupado preservando seus vínculos. Primeiro transfira ou libere as bicicletas; o sistema não escolhe outras vagas por conta própria.

### Auditoria — Grupo 3: sincronização offline

- A fila pendente é recuperada como estado visível antes de qualquer reenvio.
- Envios são serializados e a remoção usa a revisão exata confirmada pelo servidor.
- Uma versão mais nova na nuvem abre conflito sem apagar ou sobrescrever a cópia local.
- O conflito permite baixar o JSON local antes de escolher a versão da nuvem.
- Operações concorrentes de vaga permanecem bloqueadas sem conexão e informam essa limitação de forma explícita.

### Validação de publicação

- Confirmar e-mail ativado no Supabase.
- RLS ativo em todas as tabelas.
- Testar síndico, portaria e visitante.
- Testar duas bicicletas no mesmo apartamento.
- Testar números de vaga repetidos em módulos distintos.
- Verificar fotos no modo claro e escuro.
- Validar a planta em celular, inclusive tela cheia em orientação horizontal.
- Fazer backup do snapshot antes de qualquer migração estrutural.
