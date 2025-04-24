import fetch from 'node-fetch';
import axios from 'axios';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Ingresa el enlace de la imagen de Pinterest que deseas descargar. Ejemplo: .pinterest https://pin.it/xxxxxx');

  const url = args[0];
  try {
    m.react('⏳');
    const response = await axios.get(`https://api.qewertyy.dev/download/pinterest?url=${url}`);
    const data = response.data;

    if (data.status) {
      const imageUrl = data.result[0].url;
      await conn.sendFile(m.chat, imageUrl, 'pinterest.jpg', '', m);
      m.reply('Imagen descargada y enviada con éxito!');
      m.react('✅');
    } else {
      m.reply('Error al descargar la imagen');
      m.react('❌');
    }
  } catch (error) {
    console.error(error);
    m.reply('Error al procesar la solicitud');
    m.react('❌');
  }
};

handler.help = ['pinterest <url>'];
handler.tags = ['downloader'];
handler.command = ['pinterest', 'pin'];

export default handler;