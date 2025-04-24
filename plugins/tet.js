import fetch from 'node-fetch';

let pinterest = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, `❀ Ingresa el texto de lo que quieres buscar en Pinterest`, m);

  try {
    let api = await fetch(`https://api.sylphy.xyz/download/pinterest/search?q=${text}`);
    let json = await api.json();

    if (!json || !json.result || !json.result.length) return conn.reply(m.chat, `✧ No se encontraron resultados para ${text}.`, m);

    let randomRes = json.result[Math.floor(Math.random() * json.result.length)];
    let caption = `- *Titulo :* ${randomRes.title || '-'}`;

    await conn.sendMessage(m.chat, { image: { url: randomRes.url }, caption: caption }, { quoted: m });
  } catch (error) {
    console.error(error);
    conn.reply(m.chat, `Error al buscar en Pinterest`, m);
  }
};

pinterest.command = ['pin1'];
export default pinterest;