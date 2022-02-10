# CRU
## Objetivo
O objetivo da aplicação é fornecer aos estudantes da UFSC e outros contemplados uma maneira mais conveniente e monitorada de acesso a programas de auxílio à permanência estudantil, tais como o PNAES. Os beneficiários receberão o auxílio por meio da blockchain, onde as transações serão facilmente rastreadas, e poderão interagir com os recursos por meio da aplicação web.
## Estrutura
A aplicação web, portanto, tem por objetivo servir de interface para a blockchain que servirá de banco de dados (distribuído) para armazenar de maneira segura e irrefutável as transações. Esta aplicação possui o diferencial de utilizar uma blockchain para garantir a irrefutabilidade das transações, a maior segurança e a distribuição dos dados em vários nodos. Além disso, a blockchain utilizada é classificada como permissioned, ou seja, usuários terão que se autenticar para poder participar da rede.
## Funcionalidades
A principal funcionalidade de qualquer aplicação financeira é o envio de recursos entre os participantes. Nesta aplicação, além do envio de recursos, será permitido ao usuário: consultar seu saldo, consultar o histórico e realizar cadastro e login (para criação das carteiras).

## Telas da aplicação
Para realizar a modelagem preliminar da aplicação web utilizamos a ferramenta figma. A seguir o liame à modelagem desenvolvida, com dois tamanhos de janela para da uma das telas propostas: https://www.figma.com/file/iLeOZas2U7iNjRn2tN52z9/CRU?node-id=5%3A65


# Installation

### **Attention! All scripts assume you are running them from the project source folder "/cru"**

#### 1. Clone this repository on your HOME (```~/CRU```)

#### 2. Make sure you are on the root of the project, then:

#### 2.1 run

    bash install_everything.sh

#### 2.2 then

    bash run_network.sh

#### 2.3 then

    bash start_server.sh

#### 2.4 then

    bash start_client.sh

#### 2.5 And you're done. 
# Dependencies
This project requires minifabric, node and docker. The install_everything script will download and install everything for you.