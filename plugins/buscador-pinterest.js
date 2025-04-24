import fetch from 'node-fetch';

let handler = async (m, { conn, text, args }) => {
  if (!text) return m.rhandler❀ Ingresa un texto. Ejemplo: .pinterest Sylphiette`);

  try {
    if (text.includes("https://")) {
      m.react("⌛");
      let res = await fetch(`https://api.sylphy.xyz/download/pinterest?url=${args[0]}&apikey=sylph`);
      let i = await res.json();
      let isVideo = i.data.download.includes(".mp4");
      await conn.sendMessage(m.chat, { [isVideo ? "video" : "image"]: { url: i.data.download }, caption: i.data.title }, { quoted: m });
      m.react("☑️");
    } else {
      m.react('🕒');
      let res = await fetch(`https://api.sylphy.xyz/search/pinterest?q=${text}&apikey=sylph`);
      let results = await res.json();
      if (!results.data.length) return conn.reply(m.chat, `No se encontraron resultados para "${text}".`, m);

      for (let i = 0; i < Math.min(results.data.length, 10); i++) {
        let img = results.data[i];
        await conn.sendFile(m.chat, img.image_large_url, "image.jpg",
          `◜ Pinterest Search ◞\n\n≡ 🔎 \`Búsqueda :\` "${text}"\n≡ 📄 \`Resultado :\` ${i + 1} / 10`, m);
      }

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    }
  } catch (e) {
    conn.reply(m.chat, 'Error al obtener imágenes de Pinterest :\n\n' + e, m);
  }
};

handler.help = ['pinterest'];
handler.command = ['pinterest', 'pin'];
handler.tags = ['dl'];

export default handler;