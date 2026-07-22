# 📦 Sistema de Monitoramento de Pedreira (MÉTRICAMINAS)

Este projeto é um **sistema web completo** desenvolvido para centralizar e **automatizar a gestão de maquinários** de uma pedreira (Projeto Britagem). O software substitui controles manuais e planilhas físicas, garantindo o monitoramento de horas trabalhadas, desgaste de componentes e manutenções preventivas em tempo real, reduzindo o tempo de máquina parada (*downtime*) e otimizando a produtividade.

Este projeto é uma **API RESTful completa** desenvolvida para centralizar e **automatizar a gestão operacional de maquinários** de uma pedreira (Projeto Britagem). O software substitui o acompanhamento manual de planilhas físicas, garantindo o monitoramento de horas trabalhadas, o desgaste de componentes e o agendamento de manutenções preventivas em tempo real, reduzindo o downtime (tempo de máquina parada) e otimizando a produtividade.

## 🚀 O que o projeto faz
* **Gestão Centralizada:** Registro e controle de equipamentos de grande porte (britadores, peneiras, correias), categorias e fornecedores em um único local.
* **Automação de Tipagem:** Arquitetura blindada contra dados inválidos em tempo de desenvolvimento através da integração entre TypeScript e Express.
* **Integridade de Dados:** Sincronização automatizada e transparente com o banco de dados via Prisma ORM via introspecção (`db pull`), garantindo a preservação das relações do MySQL.
* **Segurança de Registro:** Proteção estrita de credenciais sensíveis e URLs de banco de dados por meio do isolamento em variáveis de ambiente (`.env`).
* **Barramento de Integração:** Disponibilização de rotas HTTP padronizadas e limpas em formato JSON, preparadas para alimentar futuros dashboards front-end.

## 🛠️ Tecnologias Utilizadas
* **Linguagem:** [TypeScript 5.x](https://www.typescriptlang.org/) - Escolhida pela sua robustez e segurança de tipos em aplicações Node.js.
* **Framework Web:** [Express](https://expressjs.com/) - Utilizado para a criação de rotas e rotinas de backend de alta performance.
* **Banco de Dados:** SQL ([MySQL 8.x](https://www.mysql.com/)) - Garante a persistência relacional e integridade dos dados da operação.
* **Persistência & ORM:** [Prisma ORM](https://www.prisma.io/) - Utilizado para mapeamento e consultas tipadas ao banco de dados sem SQL manual.
* **Execução & Runtime:** [Node.js](https://nodejs.org/) - Ambiente de execução do código JavaScript/TypeScript no servidor.

## 🔧 Como Executar
Siga os passos abaixo para replicar o ambiente de desenvolvimento em sua máquina:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/tardinnnn/projeto-britagem.git](https://github.com/tardinnnn/projeto-britagem.git)
    ```
2.  **Acesse a pasta do projeto:**
    ```bash
    cd "PROJETO BRITAGEM"
    ```
3.  **Instale as dependências:**
    ```bash
    npm install
    ```
4.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env` na raiz do projeto e insira a linha de conexão:
    ```env
    DATABASE_URL="mysql://USUARIO:SENHA@localhost:3306/projeto_sql"
    ```
5.  **Execute a sincronização do banco com o Prisma:**
    ```bash
    npx prisma db pull
    ```
6.  **Inicie o servidor:**
    ```bash
    npx ts-node src/server.ts
    ```
    Acesse em seu navegador: `http://localhost:3000/teste`.

## 📊 Status do Projeto: 🚧 Em Desenvolvimento
O projeto segue um roteiro estruturado para garantir escalabilidade e boas práticas de arquitetura.

* ✅ **Fase 1: Planejamento:** Levantamento de requisitos e modelagem relacional do banco de dados.
* ✅ **Fase 2: Ambiente:** Configuração do ecossistema Node.js, TypeScript e ajustes no `tsconfig.json`.
* ✅ **Fase 3: Camada de Dados:** Mapeamento das tabelas do MySQL via Prisma ORM (`db pull`).
* ✅ **Fase 4: Lógica de Negócio:** Inicialização do Express e validação de rota de healthcheck (`/teste`).
* 🟡 **Fase 5: Interface de Dados:** Desenvolvimento do arquivo de rotas (`routes.ts`) e integração de leitura de equipamentos (Em andamento).
* ⬜ **Fase 6: Dashboards e Relatórios:** Implementação de controllers, endpoints de escrita (POST/PUT) e validações com Zod.

---
Desenvolvido por [Bruna Tardin](https://github.com/tardinnnn) como parte dos estudos de Análise e Desenvolvimento de Sistemas com foco em Node.js, TypeScript e Bancos de Dados.
