import { writeFileSync, readFileSync, existsSync, mkdir, unlink } from 'node:fs';
import { TwitterApi } from 'twitter-api-v2';
import { parse } from 'node-html-parser';
import fetch from 'node-fetch';
import nodeHtmlToImage from 'node-html-to-image';

const leagues = ['b', 'a'];
const createDirectoryName = 'tweets';

mkdir(`${createDirectoryName}`, { recursive: true }, (err) => {
  if (err) throw err;
  writeFileSync(`${createDirectoryName}/${leagues[0]}.txt`, '0', 'utf-8');
  writeFileSync(`${createDirectoryName}/${leagues[1]}.txt`, '0', 'utf-8');
});

const client = new TwitterApi({
  appKey: process.env.appKey,
  appSecret: process.env.appSecret,
  accessToken: process.env.accessToken,
  accessSecret: process.env.accessSecret,
});

async function webScrapping(url: string, name: string) {
try {
const timestampTweetFile = `${createDirectoryName}/${name}.txt`;

if (!existsSync(timestampTweetFile)) return;
if (Number(readFileSync(timestampTweetFile)) > Date.now() - 60 * 60 * 1000) return;

const dayMonthYear = new Date();
writeFileSync(timestampTweetFile, String(Date.now()), 'utf-8');

const response = await fetch(url);
const body = await response.text();

const root = parse(body);
const javascriptFromWebScrapping = root.querySelector('#scriptReact')?.textContent;

const htmlScriptTagContent = javascriptFromWebScrapping + `var list = "<table><thead><tr><th><b>PTS</b></th><th><b>J/V/E/D</b></th><th><b>GP/GC/SG/%</b></th></tr></thead><tbody>"
for (let value of JSON.parse(JSON.stringify(classificacao.classificacao))) {
 list += \`<tr>
 <td><b style='color:\${value.faixa_classificacao_cor}'>⬤</b> <b>\${value.ordem}º <img src=\${value.escudo} width="20" height="20"> \${value.nome_popular} - \${value.pontos}</b></td>
 <td><b>\${value.jogos}/\${value.vitorias}/\${value.empates}/\${value.derrotas}</b></td>
 <td><b>\${value.gols_pro}/\${value.gols_contra}/\${value.saldo_gols}/\${value.aproveitamento}</b></td>
 </tr>\` 
}
list += "</tbody><tfoot><tr><td>twitter.com/brasileirao_bot</td><td>@brasileirao_bot</td><td>guilherme.deno.dev</td></tr></tfoot></table>";
document.getElementById("leaderboard").innerHTML = list;`;

  const imageDirectory = `./${createDirectoryName}/${Date.now()}-${name}.png`;

  nodeHtmlToImage({
    puppeteerArgs: {headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox']},
    output: imageDirectory,
    html: `<html data-theme="dark"><head><link rel="stylesheet" href="https://unpkg.com/@picocss/pico@latest/css/pico.classless.min.css"></head><body><div id="leaderboard"></div><script>${htmlScriptTagContent}</script></body></html>`
   }).then(async () => {
      const mediaIds = await Promise.all([
        client.v1.uploadMedia(imageDirectory),
      ]);
      await client.v1.tweet(`🇧🇷 Tabela do Brasileirão Série ${name.toUpperCase()}\n🗓️ ${('0' + dayMonthYear.getDate()).slice(-2)}/${('0' + (dayMonthYear.getMonth() + 1)).slice(-2)}/${dayMonthYear.getFullYear()}\n📊 #CampeonatoDoBrasileiro #Brasileirão #CampeonatoBrasileiro`, { media_ids: mediaIds })
      .catch((err: string) => {
        console.log(err);
      });

      unlink(imageDirectory, (err) => {
        if (err) console.log(err);
      });
    });
  } catch (err) {
    throw err;
  };
};

setInterval(async () => {
await webScrapping(`https://ge.globo.com/futebol/brasileirao-serie-${leagues[0]}/`, leagues[0]);
await webScrapping(`https://ge.globo.com/futebol/brasileirao-serie-${leagues[1]}/`, leagues[1]);
}, 30000);
