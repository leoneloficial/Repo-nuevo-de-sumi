import fetch from 'node-fetch';
import axios from 'axios';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Ingresa el enlace de la imagen de Pinterest que deseas descargar. Ejemplo: .pinterest https://pin.it/xxxxxx');

  const url = args[0];
  try {
    m.react('⏳');
    const apiUrl = `https://api.sylphy.xyz/download/pinterest?url=${url}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data.status) {
      const imageUrl = data.result.image_url || data.result.url;
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
handler.command = ['pinterest1', 'pin1'];

export default handler;