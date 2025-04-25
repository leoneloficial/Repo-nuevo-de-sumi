process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './settings.js'
import {createRequire} from 'module'
import path, {join} from 'path'
import {fileURLToPath, pathToFileURL} from 'url'
import {platform} from 'process'
import * as ws from 'ws'
import fs, {readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, rmSync, watch} from 'fs'
import yargs from 'yargs';
import {spawn} from 'child_process'
import lodash from 'lodash'
import { yukiJadiBot } from './plugins/jadibot-serbot.js';
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import {tmpdir} from 'os'
import {format} from 'util'
import boxen from 'boxen'
import P from 'pino'
import pino from 'pino'
import Pino from 'pino'
import {Boom} from '@hapi/boom'
import {makeWASocket, protoType, serialize} from './lib/simple.js'
import {Low, JSONFile} from 'lowdb'
import {mongoDB, mongoDBV2} from './lib/mongoDB.js'
import store from './lib/store.js'
const {proto} = (await import('@whiskeysockets/baileys')).default
const {DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, PHONENUMBER_MCC} = await import('@whiskeysockets/baileys')
import readline from 'readline'
import NodeCache from 'node-cache'
const {CONNECTING} = ws
const {chain} = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

protoType()
serialize()

global.__filename = function (pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix
    ? /file:\/\/\//.test(pathURL)
      ? fileURLToPath(pathURL)
      : pathURL
    : pathToFileURL(pathURL).toString();
};

global.__dirname = function (pathURL) {
  return path.dirname(global.__filename(pathURL, true));
};

global.__require = function (dir = import.meta.url) {
  return createRequire(dir);
};

global.API = (name, path = '/', query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  path +
  (query || apikeyqueryname
    ? '?' +
      new URLSearchParams(
        Object.entries({
          ...query,
          ...(apikeyqueryname
            ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] }
            : {})
        })
      )
    : '');
global.timestamp = { start: new Date };

const __dirname_local = global.__dirname(import.meta.url);

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp(
  '^[' +
    (opts['prefix'] ||
      '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') +
    ']'
);

global.db = new Low(
  /https?:\/\//.test(opts['db'] || '')
    ? new cloudDBAdapter(opts['db'])
    : /mongodb(\+srv)?:\/\//i.test(opts['db'])
    ? opts['mongodbv2']
      ? new mongoDBV2(opts['db'])
      : new mongoDB(opts['db'])
    : new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}database.json`)
);

global.DATABASE = global.db;
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ)
    return new Promise((resolve) =>
      setInterval(async function () {
        if (!global.db.READ) {
          clearInterval(this);
          resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
        }
      }, 1 * 1000)
    );
  if (global.db.data !== null) return;
  global.db.READ = true;
  await global.db.read().catch(console.error);
  global.db.READ = null;
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {})
  };
  global.db.chain = chain(global.db.data);
};
loadDatabase();

global.authFile = `MediaHubSeccion`;
const { state, saveState, saveCreds } = await useMultiFileAuthState(global.authFile);
const msgRetryCounterMap = (MessageRetryMap) => {};
const msgRetryCounterCache = new NodeCache();
const { version } = await fetchLatestBaileysVersion();
let phoneNumber = global.botNumber;

const methodCodeQR = process.argv.includes("qr");
const methodCode = !!phoneNumber || process.argv.includes("code");
const MethodMobile = process.argv.includes("mobile");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (texto) =>
  new Promise((resolver) => rl.question(texto, resolver));

let opcion;
if (!fs.existsSync(`./${authFile}/creds.json`) && !methodCodeQR && !methodCode) {
  while (true) {
    let lineM = '⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ 》';
    opcion = await question(`╭${lineM}
┊ ${chalk.greenBright('╭┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}     
┊ ${chalk.greenBright('┊')} ${chalk.green.bgBlue.bold.yellow('¿CÓMO DESEA CONECTARSE?')}
┊ ${chalk.greenBright('┊')} ${chalk.bold.redBright('⇢  Opción 1:')} ${chalk.greenBright('Código QR.')}
┊ ${chalk.greenBright('┊')} ${chalk.bold.redBright('⇢  Opción 2:')} ${chalk.greenBright('Código de 8 digitos.')}
┊ ${chalk.greenBright('╰┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅')}
╰${lineM}\n${chalk.bold.magentaBright('---> ')}`);
    if (opcion === '1' || opcion === '2') break;
    else {
      console.log(
        chalk.bold.redBright(
          `NO SE PERMITE NÚMEROS QUE NO SEAN ${chalk.bold.greenBright("1")} O ${chalk.bold.greenBright("2")}, TAMPOCO LETRAS O SÍMBOLOS ESPECIALES. ${chalk.bold.yellowBright("CONSEJO: COPIE EL NÚMERO DE LA OPCIÓN Y PÉGUELO EN LA CONSOLA.")}`
        )
      );
    }
  }
}

console.info = () => {};
const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion == '1' ? true : false,
  mobile: MethodMobile,
  browser:
    opcion == '1'
      ? ['MediaHub-Bot', 'Edge', '1.0.0']
      : methodCodeQR
      ? ['MediaHub-Bot', 'Edge', '1.0.0']
      : ["Ubuntu", "Chrome", "20.0.04"],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
  },
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  getMessage: async (clave) => {
    let jid = jidNormalizedUser(clave.remoteJid);
    let msg = await store.loadMessage(jid, clave.id);
    return msg?.message || "";
  },
  msgRetryCounterCache,
  msgRetryCounterMap,
  defaultQueryTimeoutMs: undefined,
  version
};

global.conn = makeWASocket(connectionOptions);

if (opcion === '2' || methodCode) {
  if (!conn.authState.creds.registered) {
    if (MethodMobile) throw new Error('⚠️ Se produjo un Error en la API de movil');

    let addNumber;
    if (!!phoneNumber) {
      addNumber = phoneNumber.replace(/[^0-9]/g, '');
      // CORRECCIÓN: Se reemplaza 'numeroTelefono' por 'addNumber'
      if (!Object.keys(PHONENUMBER_MCC).some(v => addNumber.startsWith(v))) {
        console.log(chalk.bgBlack(chalk.bold.redBright("\n\n✴️ Su número debe comenzar  con el codigo de pais")));
        process.exit(0);
      }
    } else {
      while (true) {
        addNumber = await question(chalk.bgBlack(chalk.bold.greenBright("\n\n✳️ Escriba su numero\n\nEjemplo: 5491168xxxx\n\n\n\n")));
        addNumber = addNumber.replace(/[^0-9]/g, '');
  
        if (addNumber.match(/^\d+$/) && Object.keys(PHONENUMBER_MCC).some(v => addNumber.startsWith(v))) {
          break;
        } else {
          console.log(chalk.bgBlack(chalk.bold.redBright("\n\n✴️ Asegúrese de agregar el código de país")));
        }
      }
    }
    
    setTimeout(async () => {
      let codeBot = await conn.requestPairingCode(addNumber);
      codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot;
      console.log(chalk.bold.white(chalk.bgMagenta(`CÓDIGO DE VINCULACIÓN:`)), chalk.bold.white(chalk.white(codeBot)));
      rl.close();
    }, 3000);
  }
}

conn.isInit = false;

if (!opts['test']) {
  setInterval(async () => {
    if (global.db.data) await global.db.write().catch(console.error);
    if (opts['autocleartmp'])
      try {
        clearTmp();
      } catch (e) {
        console.error(e);
      }
  }, 60 * 1000);
}

if (opts['server']) (await import('./server.js')).default(global.conn, PORT);

async function clearTmp() {
  const tmp = [tmpdir(), join(__dirname_local, './tmp')];
  const filename = [];
  tmp.forEach(dirname => readdirSync(dirname).forEach(file => filename.push(join(dirname, file))));
  return filename.map(file => {
    const stats = statSync(file);
    if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 1))
      return unlinkSync(file); // 1 minuto
    return false;
  });
}

setInterval(async () => {
  await clearTmp();
  console.log(chalk.cyan(`AUTO-CLEAR \n ARCHIVOS DE LA CARPETA TEMPORALES ELIMINADAS`));
}, 60000); // 1 minuto

function purgeSession() {
  let prekey = [];
  let directorio = readdirSync("./MediHubSeccion");
  let filesFolderPreKeys = directorio.filter(file => file.startsWith('pre-key-'));
  prekey = [...prekey, ...filesFolderPreKeys];
  filesFolderPreKeys.forEach(files => {
    unlinkSync(`./MediaHubSeccion/${files}`);
  });
}

function purgeSessionSB() {
  try {
    let listaDirectorios = readdirSync('./jadibts/');
    let SBprekey = [];
    listaDirectorios.forEach(directorio => {
      if (statSync(`./jadibts/${directorio}`).isDirectory()) {
        let DSBPreKeys = readdirSync(`./jadibts/${directorio}`).filter(fileInDir =>
          fileInDir.startsWith('pre-key-')
        );
        SBprekey = [...SBprekey, ...DSBPreKeys];
        DSBPreKeys.forEach(fileInDir => {
          unlinkSync(`./jadibts/${directorio}/${fileInDir}`);
        });
      }
    });
    if (SBprekey.length === 0) return;
  } catch (err) {
    console.log(chalk.bold.red(`[ ℹ️ ] Algo salió mal durante la eliminación, archivos no eliminados`));
  }
}

function purgeOldFiles() {
  const directories = ['./MediaHubSeccion/', './jadibts/'];
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  directories.forEach(dir => {
    readdirSync(dir, (err, files) => {
      if (err) throw err;
      files.forEach(file => {
        const filePath = path.join(dir, file);
        stat(filePath, (err, stats) => {
          if (err) throw err;
          if (stats.isFile() && stats.mtimeMs < oneHourAgo && file !== 'creds.json') {
            unlinkSync(filePath, err => {
              if (err) throw err;
              console.log(chalk.bold.green(`Archivo ${file} borrado con éxito`));
            });
          } else {
            console.log(chalk.bold.red(`Archivo ${file} no borrado` + err));
          }
        });
      });
    });
  });
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin, qr } = update;
  global.stopped = connection;
  if (isNewLogin) conn.isInit = true;
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();
  // Si hay QR, lo notificamos
  if (qr && qr !== 0) {
    if (opcion == '1' || methodCodeQR) {
      console.log(chalk.cyan('POR FAVOR ESCANEA EL CÓDIGO QR, EXPIRA EN 45 SEGUNDOS ✅.'));
    }
  }
  if (connection == 'open') {
    console.log(chalk.bold.greenBright('\nＣＯＮＥＣＸＩＯＮ ＥＸＩＴＯＳＡ'));
  }
  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
  if (reason == 405) {
    fs.unlinkSync("./InkaSeccion/" + "creds.json");
    console.log(chalk.bold.redBright(`[ ⚠ ] Conexión reemplazada, reiniciando...`));
    process.send('reset');
  }
  if (connection === 'close') {
    if (reason === DisconnectReason.badSession) {
      conn.logger.error(`[ ⚠ ] Sesión incorrecta. Elimina la carpeta ${global.authFile} y escanea nuevamente.`);
    } else if (reason === DisconnectReason.connectionClosed) {
      conn.logger.warn(`[ ⚠ ] Conexión cerrada, reconectando...`);
      await global.reloadHandler(true).catch(console.error);
    } else if (reason === DisconnectReason.connectionLost) {
      conn.logger.warn(`[ ⚠ ] Conexión perdida, reconectando...`);
      await global.reloadHandler(true).catch(console.error);
    } else if (reason === DisconnectReason.connectionReplaced) {
      conn.logger.error(`[ ⚠ ] Conexión reemplazada. Cierra la sesión actual.`);
    } else if (reason === DisconnectReason.loggedOut) {
      conn.logger.error(`[ ⚠ ] Sesión cerrada. Elimina la carpeta ${global.authFile} y escanea nuevamente.`);
    } else if (reason === DisconnectReason.restartRequired) {
      conn.logger.info(`[ ⚠ ] Reinicio necesario, reinicia el servidor si presenta problemas.`);
      await global.reloadHandler(true).catch(console.error);
    } else if (reason === DisconnectReason.timedOut) {
      conn.logger.warn(`[ ⚠ ] Tiempo de conexión agotado, reconectando...`);
      await global.reloadHandler(true).catch(console.error);
    } else {
      conn.logger.warn(`[ ⚠ ] Razón desconocida. ${reason || ''}: ${connection || ''}`);
      await global.reloadHandler(true).catch(console.error);
    }
  }
}

process.on('uncaughtException', console.error);

let isInit = true;
let handler = await import('./handler.js');
global.reloadHandler = async function (restartConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
    if (Handler && Object.keys(Handler).length) handler = Handler;
  } catch (e) {
    console.error('Error al cargar handler:', e);
  }
  if (restartConn) {
    const oldChats = global.conn.chats;
    try {
      global.conn.ws.close();
    } catch { }
    conn.ev.removeAllListeners();
    global.conn = makeWASocket(connectionOptions, { chats: oldChats });
    isInit = true;
  }
  if (!isInit) {
    // Remover listeners anteriores
    conn.ev.off('messages.upsert', conn.handler);
    conn.ev.off('group-participants.update', conn.participantsUpdate);
    conn.ev.off('groups.update', conn.groupsUpdate);
    conn.ev.off('message.delete', conn.onDelete);
    conn.ev.off('connection.update', conn.connectionUpdate);
    conn.ev.off('creds.update', conn.credsUpdate);
  }
  
  // Configurar mensajes de bienvenida y otros (si aplica)
  conn.welcome = 'Hola 👋 @user ¿COMO ESTAS? 🤗 Bienvenido, lee las reglas del grupo.';
  conn.bye = 'Adiós @user, que tengas un excelente día.';
  
  // Asignar handlers con try-catch para robustez
  conn.handler = async (m) => {
    try {
      await handler.handler.call(global.conn, m);
    } catch (err) {
      console.error('Error en el handler:', err);
    }
  };
  conn.participantsUpdate = async (update) => {
    try {
      await handler.participantsUpdate.call(global.conn, update);
    } catch (err) {
      console.error('Error en participantsUpdate:', err);
    }
  };
  conn.groupsUpdate = async (update) => {
    try {
      await handler.groupsUpdate.call(global.conn, update);
    } catch (err) {
      console.error('Error en groupsUpdate:', err);
    }
  };
  conn.onDelete = async (m) => {
    try {
      await handler.deleteUpdate.call(global.conn, m);
    } catch (err) {
      console.error('Error en message.delete:', err);
    }
  };
  conn.connectionUpdate = connectionUpdate.bind(global.conn);
  conn.credsUpdate = saveCreds.bind(global.conn, true);
  
  // Registrar eventos con sus nuevos handlers
  conn.ev.on('messages.upsert', async (m) => {
    try {
      // Log para distinguir mensajes de grupo y privados
      const msg = m.messages[0];
      const isGroup = msg.key.remoteJid.endsWith('@g.us');
      console.log(`[${isGroup ? 'GRUPO' : 'PRIVADO'}] Mensaje recibido:`, msg.message ? JSON.stringify(msg.message).slice(0, 100) : '');
      await conn.handler(m);
    } catch (err) {
      console.error('Error en messages.upsert:', err);
    }
  });
  conn.ev.on('group-participants.update', conn.participantsUpdate);
  conn.ev.on('groups.update', conn.groupsUpdate);
  conn.ev.on('message.delete', conn.onDelete);
  conn.ev.on('connection.update', conn.connectionUpdate);
  conn.ev.on('creds.update', conn.credsUpdate);
  
  isInit = false;
  return true;
};

const pluginFolder = global.__dirname(join(__dirname_local, './plugins/index'));
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};
async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename));
      const module = await import(file);
      global.plugins[filename] = module.default || module;
    } catch (e) {
      conn.logger.error(e);
      delete global.plugins[filename];
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true);
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(`Plugins actualizado: '${filename}'`);
      else {
        conn.logger.warn(`delete plugins: '${filename}'`);
        return delete global.plugins[filename];
      }
    } else conn.logger.info(`Nuevo plugins:  '${filename}'`);
    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    });
    if (err) conn.logger.error(`❌ error de sintaxis al cargar '${filename}'\n${format(err)}`);
    else {
      try {
        const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
        global.plugins[filename] = module.default || module;
      } catch (e) {
        conn.logger.error(`❌ Error require plugins: '${filename}\n${format(e)}'`);
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
      }
    }
  }
};

Object.freeze(global.reload);
watch(pluginFolder, global.reload);
await global.reloadHandler();

async function _quickTest() {
  let test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version'])
  ].map(p => {
    return Promise.race([
      new Promise(resolve => {
        p.on('close', code => {
          resolve(code !== 127);
        });
      }),
      new Promise(resolve => {
        p.on('error', _ => resolve(false));
      })
    ]);
  }));

  let [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
  console.log(test);
  let s = global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find };
  Object.freeze(global.support);
}

_quickTest()
  .then(() => conn.logger.info('INICIANDO 1 2 3．．．.\n'))
  .catch(console.error);