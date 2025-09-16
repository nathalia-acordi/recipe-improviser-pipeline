
<div align="center">
   <h1>🍳 Recipe Improviser Pipeline</h1>
   <p>Arquitetura serverless para geração e consulta de receitas culinárias usando <b>AWS Lambda</b>, <b>SNS</b>, <b>SQS</b>, <b>API Gateway</b> e <b>MongoDB Atlas</b>.</p>
</div>

---

## 🔄 Fluxo Resumido

```mermaid
flowchart TD
    A(Usuário: POST /recipe):::user -->|Cria job| B(Producer Lambda):::lambda
    B -->|Publica| C(SNS):::sns
    C -->|Entrega| D(SQS):::sqs
    D -->|Aciona| E(Worker Lambda):::lambda2
    E -->|Processa e salva| F(MongoDB Atlas):::mongo
    G(Usuário: GET resultado):::user -->|Consulta| F

    classDef user fill:#e3fcec,stroke:#2ecc40,stroke-width:2px,color:#222;
    classDef lambda fill:#fff3cd,stroke:#f1c40f,stroke-width:2px,color:#222;
    classDef lambda2 fill:#f9e79f,stroke:#f39c12,stroke-width:2px,color:#222;
    classDef sns fill:#eaf6ff,stroke:#3498db,stroke-width:2px,color:#222;
    classDef sqs fill:#fce4ec,stroke:#e84393,stroke-width:2px,color:#222;
    classDef mongo fill:#e8f5e9,stroke:#27ae60,stroke-width:2px,color:#222;

    class A,G user;
    class B lambda;
    class E lambda2;
    class C sns;
    class D sqs;
    class F mongo;
```


---

## ⚡ Resultado e Impacto das Otimizações

### Lista das melhorias implementadas

- **Sistema de mensageria (SNS/SQS):** Permite desacoplar o recebimento do pedido do processamento pesado, garantindo respostas rápidas ao usuário e maior resiliência.
- **Prompts mais precisos e respostas curtas:** Ajustamos os prompts enviados à OpenAI para serem mais objetivos, limitando o tamanho e a complexidade das respostas. Isso reduziu o risco de respostas truncadas e acelerou o processamento.
- **Aumento da memória do worker para 256 MB:** Com mais memória, a AWS Lambda também oferece mais CPU, reduzindo o tempo de execução da função.

### Parágrafo de impacto

<p align="center"><b>Essas práticas garantem um sistema responsivo, resiliente e com baixo custo operacional, ideal para workloads serverless modernos.</b></p>

Essas práticas, combinadas, garantem um pipeline mais rápido, escalável e econômico.

---

## Comparativo de Performance e Custos

### ⏱️ Tabela de memória, latência e custo

| Cenário                | Memória | Latência/job | Custo mensal (USD) |
|------------------------|---------|--------------|--------------------|
| Antes (antigo)         | 128 MB  | 12 s         | $3,78              |
| Depois (256 MB, otimizado)  | 256 MB  | 4,8 s        | $2,78              |


### 💸 Comparativo de custos considerando o free tier

**Cenário:** 300 usuários × 50 requisições/dia × 30 dias = **450.000 execuções/mês**

O free tier da AWS Lambda cobre até **1 milhão de execuções** e **400.000 GB-segundos** por mês. Só o que exceder esses limites é cobrado.

| Cenário                 | Memória | Duração média | Execuções/mês | GB-s/mês | Execuções pagas | GB-s pagos | Custo mensal (USD) |
|-------------------------|---------|--------------|--------------:|---------:|----------------:|-----------:|-------------------:|
| Antes (antigo)          | 128 MB  | 12 s         |      450.000  | 675.000  |               0 |    275.000 |           $4,58    |
| Depois (256 MB, atual)  | 256 MB  | 4,8 s        |      450.000  | 540.000  |               0 |    140.000 |           $2,33    |

**Detalhes do cálculo:**
- 128 MB, 12s: 0,125 GB × 12 s × 450.000 = 675.000 GB-s (400.000 grátis, 275.000 pagos) × $0.00001667 = $4,58
- 256 MB, 4,8s: 0,25 GB × 4,8 s × 450.000 = 540.000 GB-s (400.000 grátis, 140.000 pagos) × $0.00001667 = $2,33
- Execuções: 450.000 < 1.000.000 → grátis

---

## 🚀 Como preparar o ambiente

### Lambda Layer do MongoDB
<details>
<summary>Como criar a layer do MongoDB <b>(clique para expandir)</b></summary>

A Lambda Layer permite compartilhar a dependência <code>mongodb</code> entre todas as funções, sem precisar incluir o pacote em cada zip. Siga os passos:

```sh
# 1. Estrutura de pastas
mkdir -p layer-mongodb/nodejs
cd layer-mongodb/nodejs

# 2. Inicialize e instale dependências
npm init -y
npm install mongodb

# 3. Volte e compacte
cd ../..
cd layer-mongodb
zip -r layer-mongodb.zip nodejs
cd ..
```

Depois, faça upload do `.zip` em <b>Lambda &gt; Layers</b> na AWS e adicione a layer nas funções.
</details>

> ⚠️ **Observação:** Não inclua a pasta <code>node_modules</code> do layer no repositório. Apenas mantenha o script de geração e o <code>.zip</code> para deploy.

---

## ☁️ Deploy na AWS Lambda

### Empacotamento das funções
Para cada função (<code>producer</code>, <code>worker</code>, <code>reader</code>):

```sh
# Exemplo para a função producer
zip -r producer.zip index.mjs shared/
```
Faça upload do zip em <b>Lambda &gt; Funções</b> na AWS.

### Configuração das variáveis de ambiente

Adicione as variáveis de ambiente:
- <code>MONGODB_URI</code>: string de conexão do MongoDB Atlas
- <code>TOPIC_ARN</code>: ARN do tópico SNS (producer)
- <code>OPENAI_API_KEY</code>: chave da API OpenAI (worker)

### Integração com API Gateway

Rotas sugeridas:

| Método | Rota              | Função Lambda |
|--------|-------------------|---------------|
| POST   | /recipe           | producer      |
| GET    | /result/{jobId}   | reader        |
| GET    | /health           | health check  |

### Integração com SNS e SQS

1. Crie um tópico SNS para os jobs.
2. Crie uma fila SQS (preferencialmente FIFO) e associe ao SNS.
3. Configure a Lambda <code>worker</code> para ser acionada por eventos da SQS.

### MongoDB Atlas

1. Crie um cluster e a collection <code>jobs</code>.
2. Libere o IP do Lambda na whitelist.
3. Use a string de conexão em <code>MONGODB_URI</code>.

---

## 🧪 Testes Locais
- Use <code>vitest</code> para rodar os testes automatizados:
   ```sh
   npx vitest run
   ```

---

## 💡 Observações
- Cada função Lambda é independente e pode ser atualizada individualmente.
- O uso de layer para o MongoDB reduz o tamanho dos pacotes e facilita manutenção.
- O projeto já está pronto para produção serverless e pode ser expandido facilmente.

---

## 💬 Contato

<div align="center">
   <h3>💬 Ficou com dúvidas, quer trocar ideias ou colaborar?</h3>
   <b>Entre em contato comigo!</b><br><br>
   <a href="mailto:nathaliaccord@gmail.com" target="_blank">
      <img src="https://img.shields.io/badge/E--mail-nathaliaccord@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="E-mail Badge"/>
   </a>
   <a href="https://www.linkedin.com/in/nath%C3%A1lia-acordi-0a564b223/" target="_blank">
      <img src="https://img.shields.io/badge/LinkedIn-Nathália%20Acordi-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
   </a>
   <br><br>
   Se curtiu o projeto, dê uma estrela! ⭐
</div>

---

## 🚀 Como preparar o ambiente

### 1️⃣ Gerando a Lambda Layer do MongoDB
<details>
<summary>Como criar a layer do MongoDB <b>(clique para expandir)</b></summary>

A Lambda Layer permite compartilhar a dependência <code>mongodb</code> entre todas as funções, sem precisar incluir o pacote em cada zip. Siga os passos:

```sh
# 1. Estrutura de pastas
mkdir -p layer-mongodb/nodejs
cd layer-mongodb/nodejs

# 2. Inicialize e instale dependências
npm init -y
npm install mongodb

# 3. Volte e compacte
cd ../..
cd layer-mongodb
zip -r layer-mongodb.zip nodejs
cd ..
```

Depois, faça upload do `.zip` em <b>Lambda &gt; Layers</b> na AWS e adicione a layer nas funções.
</details>

> ⚠️ **Observação:** Não inclua a pasta <code>node_modules</code> do layer no repositório. Apenas mantenha o script de geração e o <code>.zip</code> para deploy.

---

## ☁️ Deploy na AWS Lambda

### 2️⃣ Empacotamento das funções
Para cada função (<code>producer</code>, <code>worker</code>, <code>reader</code>):

```sh
# Exemplo para a função producer
zip -r producer.zip index.mjs shared/
```
Faça upload do zip em <b>Lambda &gt; Funções</b> na AWS.

### 3️⃣ Configuração das Funções Lambda

Adicione as variáveis de ambiente:
- <code>MONGODB_URI</code>: string de conexão do MongoDB Atlas
- <code>TOPIC_ARN</code>: ARN do tópico SNS (producer)
- <code>OPENAI_API_KEY</code>: chave da API OpenAI (worker)

### 4️⃣ Integração com API Gateway

Rotas sugeridas:

| Método | Rota              | Função Lambda |
|--------|-------------------|---------------|
| POST   | /recipe           | producer      |
| GET    | /result/{jobId}   | reader        |
| GET    | /health           | health check  |

### 5️⃣ Integração com SNS e SQS

1. Crie um tópico SNS para os jobs.
2. Crie uma fila SQS (preferencialmente FIFO) e associe ao SNS.
3. Configure a Lambda <code>worker</code> para ser acionada por eventos da SQS.

### 6️⃣ MongoDB Atlas

1. Crie um cluster e a collection <code>jobs</code>.
2. Libere o IP do Lambda na whitelist.
3. Use a string de conexão em <code>MONGODB_URI</code>.

---

## 🧪 Testes Locais
- Use <code>vitest</code> para rodar os testes automatizados:
   ```sh
   npx vitest run
   ```

---

## 💡 Observações
- Cada função Lambda é independente e pode ser atualizada individualmente.
- O uso de layer para o MongoDB reduz o tamanho dos pacotes e facilita manutenção.
- O projeto já está pronto para produção serverless e pode ser expandido facilmente.

---

## 💬 Contato

<div align="center">
   <h3>💬 Ficou com dúvidas, quer trocar ideias ou colaborar?</h3>
   <b>Entre em contato comigo!</b><br><br>
   <a href="mailto:nathaliaccord@gmail.com" target="_blank">
      <img src="https://img.shields.io/badge/E--mail-nathaliaccord@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="E-mail Badge"/>
   </a>
   <a href="https://www.linkedin.com/in/nath%C3%A1lia-acordi-0a564b223/" target="_blank">
      <img src="https://img.shields.io/badge/LinkedIn-Nathália%20Acordi-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
   </a>
   <br><br>
   Se curtiu o projeto, dê uma estrela! ⭐
</div>
   <br><br>
   Se curtiu o projeto, dê uma estrela! ⭐
</div>


