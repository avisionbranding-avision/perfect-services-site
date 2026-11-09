# Mudança do site para a Cloudflare: passo a passo

O código já está pronto no GitHub (commit `0c19d31`). O mesmo repositório funciona no Netlify e na Cloudflare, então o site atual continua no ar até a troca do domínio. Os logins, chaves e senhas são seus: **nunca cole chaves no chat**, cole direto nos campos indicados.

Tempo total: cerca de 40 minutos, mais a espera do DNS.

---

## 1. Resend (envio dos e-mails de lead), 5 min
1. Crie a conta em **resend.com** usando **avisionbranding@gmail.com**. Tem que ser esse e-mail, porque no plano grátis, sem domínio próprio, o Resend só entrega para o e-mail da conta.
2. Menu **API Keys → Create API Key**, permissão **Sending access**.
3. Copie a chave (começa com `re_`) e guarde até o passo 4. Ela só aparece uma vez.

## 2. Conta e banco de leads na Cloudflare, 5 min
1. Crie a conta em **dash.cloudflare.com**.
2. Menu **Storage & Databases → D1 → Create database**, com o nome `perfect-services-leads`.

## 3. Ligar o site ao GitHub, 10 min
1. **Workers & Pages → Create → Pages → Connect to Git**.
2. Autorize o GitHub e escolha **avisionbranding-avision/perfect-services-site**.
3. Configuração de build:
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `node scripts/build.mjs`
   - Build output directory: deixe vazio (raiz). Se o campo exigir um valor, use `/`.
4. **Save and Deploy**. Ao final, o site abre num endereço `algo.pages.dev`.

## 4. Configurações do projeto, 5 min
No projeto do Pages, em **Settings**:
1. **Bindings → Add → D1 database**: Variable name `LEADS_DB`, banco `perfect-services-leads`.
2. **Variables and Secrets** (Production):
   - `RESEND_API_KEY` = a chave do passo 1, do tipo **Secret**;
   - `LEAD_EMAIL_TO` = `avisionbranding@gmail.com`.
3. **Deployments → Retry deployment** no último deploy, para as configurações valerem.

## 5. Teste no endereço provisório, 3 min
1. Abra `https://<seu-projeto>.pages.dev/areas/greer-sc/house-cleaning/#book`.
2. Envie o formulário com dados de teste (nome "Teste Avision", seu telefone).
3. Em até 1 minuto chega o e-mail "Novo lead: Teste Avision…" no avisionbranding@gmail.com.
4. Me avise o resultado. Se não chegar, eu vejo o log da função com você.

## 6. Login no painel (Cloudflare Access), 10 min
Isso protege a aba Leads, que tem nome e telefone de clientes.
1. Menu **Zero Trust**: escolha um nome de equipe (ex.: `avision`) e o plano **Free**.
2. **Access → Applications → Add an application → Self-hosted**:
   - Nome: `Painel Perfect Services`
   - Destinos: `perfectservicespaintingcleaning.com/painel` e `perfectservicespaintingcleaning.com/api/leads`
   - Policy: **Allow**, Include → **Emails** → `avisionbranding@gmail.com`
   - Login: **One-time PIN**, que manda um código para o seu e-mail.
3. Depois de salvar, copie o **Application Audience (AUD) Tag** da aplicação.
4. Volte ao projeto do Pages, **Variables and Secrets**, e adicione:
   - `ACCESS_AUD` = o AUD Tag;
   - `ACCESS_TEAM_DOMAIN` = `https://<nome-da-equipe>.cloudflareaccess.com`.
5. Faça o **Retry deployment** de novo.

Este passo só passa a valer depois do domínio na Cloudflare (passo 7). Até lá, a lista de leads fica fechada para todos, e os leads chegam normalmente por e-mail.

## 7. Trocar o domínio, 10 min + espera do DNS
Situação atual, verificada em 09/11: o domínio está na **Hostinger** (nameservers `cosmos.dns-parking.com` e `nova.dns-parking.com`). O DNS tem só 3 registros:

| Tipo | Nome | Valor | O que fazer |
|---|---|---|---|
| A | `@` | `75.2.60.5` (Netlify) | Apagar na Cloudflare. O passo 7.4 cria o certo. |
| CNAME | `www` | `perfectservicespaintingcleaning.netlify.app` | Apagar na Cloudflare. O passo 7.4 cria o certo. |
| TXT | `@` | `google-site-verification=duwQNYvZQdVl5YSa25w19g8npcqCd0ZAatOQWzmiC9I` | **Manter.** É o que prova ao Search Console que o domínio é seu. |

Não há e-mail no domínio (nenhum MX), então não há risco para e-mail.

1. Na Cloudflare: **Add a domain** → `perfectservicespaintingcleaning.com` → plano **Free**.
2. Na revisão do DNS: confira que o **TXT do Google** veio (se não vier, crie igual à tabela) e apague o A `75.2.60.5` e o CNAME `www` do Netlify.
3. A Cloudflare mostra 2 nameservers. Na **Hostinger**: Domínios → perfectservicespaintingcleaning.com → **DNS / Nameservers → Alterar nameservers** → cole os 2 da Cloudflare.
4. Quando o domínio ficar **Active** (de minutos a algumas horas), no projeto do Pages: **Custom domains → Set up a custom domain** → `perfectservicespaintingcleaning.com`, e depois `www.perfectservicespaintingcleaning.com`.

Durante a espera do DNS o site não cai: parte das pessoas vê o Netlify e parte vê a Cloudflare, os dois com o mesmo conteúdo.

## 8. Depois que estiver no ar, comigo
Me avise e eu faço a minha parte:
- testo todas as páginas, o formulário, a aba Leads com o login e o sitemap;
- ajusto as rotinas de artigos e o monitor para a Cloudflare (`[skip ci]`, uma publicação por dia às 7h);
- **Google Search Console**:
  - confirmo que a propriedade continua verificada (o TXT do Google foi mantido no DNS da Cloudflare);
  - reenvio o `sitemap.xml`, que agora usa endereços sem `.html`;
  - peço a inspeção do `/blog` e dos artigos antigos com o endereço novo;
  - acompanho o relatório de páginas por alguns dias, para os endereços `.html` antigos aparecerem como "página com redirecionamento", e não como erro.
- **Google Tag Manager (GTM)**:
  - hoje o site usa o Google Analytics 4 direto (G-NBGQ3ZCS3N), com os eventos `generate_lead`, `click_call` e `click_sms`;
  - crio o contêiner do GTM na conta da Avision e coloco o código dele em todas as páginas pelo gerador do site;
  - passo o GA4 e os 3 eventos para dentro do GTM, tirando o código direto, para não contar cada visita em dobro;
  - deixo pronto para adicionar Google Ads, pixel da Meta e outras tags sem mexer no código;
  - confiro no modo de visualização do GTM e no Tempo real do GA4 que visita, ligação, SMS e pedido de orçamento continuam sendo contados.

Depois de 2 ou 3 dias estável, você pode desligar o site no Netlify. **Antes de desligar**, baixe os pedidos antigos: Netlify → Forms → `estimate` e `estimate-local` → **Download as CSV**. É o único dado que existe só no Netlify. Todo o resto (site, artigos, painel, dados) está no GitHub.

## Opcional: o lead chegar direto no e-mail do Tony
Hoje o lead vai só para a Avision e você repassa. Se um dia quiser o botão "Aprovar e enviar ao Tony" com envio automático:
1. Verifique o domínio no Resend (Domains → Add, com registros de DNS na Cloudflare).
2. Adicione `LEAD_EMAIL_FROM` = `Perfect Services <leads@perfectservicespaintingcleaning.com>` e `LEAD_FORWARD_EMAIL` = o e-mail do Tony.
