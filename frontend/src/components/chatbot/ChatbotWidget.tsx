import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Search,
  BarChart2,
  AlertTriangle,
  HelpCircle,
  Plus,
  History,
  ChevronDown,
  Loader2,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getChatbotStatus,
  createConversacion,
  listConversaciones,
  getConversacion,
  sendMensajeChatbot,
  ConversacionChatbot,
  MensajeChatbot,
  ChatbotStatus,
} from '../../api/chatbot.api';

export const ChatbotWidget: React.FC = () => {
  const { user, activeCompany } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ChatbotStatus | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionChatbot[]>([]);
  const [currentConversacion, setCurrentConversacion] = useState<ConversacionChatbot | null>(null);
  const [messages, setMessages] = useState<MensajeChatbot[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar estado de IA al montar
  useEffect(() => {
    getChatbotStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          disponible: true,
          motor: 'Motor de Reglas Locales',
          proveedor: 'NexoSupply Local Core',
          activo: false,
          aislamientoMultiTenant: true,
          categoriasDisponibles: {
            1: 'Consultar información',
            2: 'Analizar mi empresa',
            3: 'Detectar problemas y riesgos',
            4: 'Ayuda y orientación',
          },
        })
      );
  }, []);

  // Cargar conversaciones al abrir
  useEffect(() => {
    if (isOpen && activeCompany) {
      loadConversaciones();
    }
  }, [isOpen, activeCompany]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadConversaciones = async () => {
    try {
      const list = await listConversaciones();
      setConversaciones(list);
    } catch {
      setConversaciones([]);
    }
  };

  const handleStartCategory = async (categoriaOpcion: number, titulo?: string) => {
    setIsLoading(true);
    setShowHistory(false);
    try {
      const nueva = await createConversacion(categoriaOpcion, titulo);
      setCurrentConversacion(nueva);
      // Cargar detalles para obtener el mensaje de bienvenida generado por backend
      const detalle = await getConversacion(nueva.id);
      setCurrentConversacion(detalle);
      setMessages(detalle.mensajes || []);
      await loadConversaciones();
    } catch (err) {
      console.error('Error al iniciar conversación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversacion = async (conv: ConversacionChatbot) => {
    setIsLoading(true);
    setShowHistory(false);
    try {
      const detalle = await getConversacion(conv.id);
      setCurrentConversacion(detalle);
      setMessages(detalle.mensajes || []);
    } catch (err) {
      console.error('Error al cargar conversación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    // Si no hay conversación abierta, crear una genérica (Opción 1)
    let convId = currentConversacion?.id;
    if (!convId) {
      try {
        const nueva = await createConversacion(1, text.slice(0, 30));
        setCurrentConversacion(nueva);
        convId = nueva.id;
      } catch (err) {
        console.error('Error al crear conversación rápida:', err);
        return;
      }
    }

    // Optimistic user message
    const tempUserMsg: MensajeChatbot = {
      id: `temp-${Date.now()}`,
      conversacion_id: convId,
      remitente: 'USUARIO',
      contenido: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await sendMensajeChatbot(convId, text);
      // Agregar la respuesta real generada por el asistente
      setMessages((prev) => [...prev, response.mensaje]);
      await loadConversaciones();
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      const errorMsg: MensajeChatbot = {
        id: `err-${Date.now()}`,
        conversacion_id: convId,
        remitente: 'ASISTENTE',
        contenido:
          'Hubo un error al procesar su solicitud con el servicio de conocimiento documental. Por favor, intente de nuevo.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text: string) => {
    // Formateo simple de negritas, viñetas y saltos de línea
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Reemplazo básico de **texto** y enlaces markdown [texto](url)
      let formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(
          /\[(.*?)\]\((https?:\/\/.*?)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-medium hover:text-blue-800 inline-flex items-center gap-0.5">$1</a>'
        );
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc my-0.5"
            dangerouslySetInnerHTML={{ __html: formattedLine.slice(2) }}
          />
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li
            key={idx}
            className="ml-4 list-decimal my-0.5"
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s/, '') }}
          />
        );
      }
      return (
        <p
          key={idx}
          className="my-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  const menuOptions = [
    {
      opcion: 1,
      titulo: 'Consultar información',
      subtitulo: 'Productos, inventario, órdenes y proveedores registrados.',
      icon: Search,
      color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/70',
      iconBg: 'bg-blue-600 text-white',
      sugerencias: [
        '¿Cuáles son los 5 productos con menor inventario?',
        '¿Qué órdenes de compra están en estado PENDIENTE?',
        'Muéstrame la lista de proveedores activos.',
      ],
    },
    {
      opcion: 2,
      titulo: 'Analizar mi empresa',
      subtitulo: 'Indicadores clave, volumen de compras y calificaciones.',
      icon: BarChart2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70',
      iconBg: 'bg-emerald-600 text-white',
      sugerencias: [
        '¿Cuál es el volumen total de compras este mes?',
        '¿Quiénes son nuestros proveedores con mejor calificación?',
        '¿Qué porcentaje del presupuesto se ha ejecutado?',
      ],
    },
    {
      opcion: 3,
      titulo: 'Detectar problemas y riesgos',
      subtitulo: 'Alertas críticas activas, quiebres de stock y retrasos.',
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70',
      iconBg: 'bg-amber-600 text-white',
      sugerencias: [
        '¿Hay alertas críticas sin resolver hoy?',
        '¿Qué productos están actualmente bajo el stock mínimo?',
        '¿Cuáles proveedores tienen entregas atrasadas?',
      ],
    },
    {
      opcion: 4,
      titulo: 'Ayuda y orientación',
      subtitulo: 'Cómo registrar solicitudes, órdenes y administrar el SaaS.',
      icon: HelpCircle,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70',
      iconBg: 'bg-indigo-600 text-white',
      sugerencias: [
        '¿Cómo crear una nueva Solicitud de Compra?',
        '¿Cómo funciona el flujo de aprobación y recepción de órdenes?',
        '¿Cómo configurar los roles y permisos de los usuarios?',
      ],
    },
  ];

  return (
    <>
      {/* Botón flotante en esquina inferior derecha */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center space-x-2.5 px-4 py-3 bg-[#0B192C] hover:bg-[#142742] text-white rounded-full shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 border border-blue-500/30 group"
            title="Abrir Asistente Virtual NexoSupply"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-inner">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold block leading-tight flex items-center space-x-1">
                <span>Asistente IA</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </span>
              <span className="text-[10px] text-blue-200 block leading-tight">
                MySQL + Drive RAG
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Ventana Expandible del Chatbot */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 w-[92vw] sm:w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Header del Asistente */}
          <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-[#142742]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold leading-tight">Asistente NexoSupply</h3>
                  <span className="flex h-2 w-2 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        status?.activo ? 'bg-emerald-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        status?.activo ? 'bg-emerald-500' : 'bg-emerald-500'
                      }`}
                    ></span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate max-w-[210px]">
                  {activeCompany?.razonSocial || 'NexoSupply CR'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Historial de conversaciones"
                className={`p-1.5 rounded-lg transition-colors ${
                  showHistory ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-[#142742]'
                }`}
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentConversacion(null);
                  setMessages([]);
                  setShowHistory(false);
                }}
                title="Nueva conversación"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-[#142742] rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar asistente"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-[#142742] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader: Estado del Modelo de IA y RAG */}
          <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {status?.motor || 'MySQL Operativo + RAG Google Drive'}
              </span>
            </span>
            <span className="font-medium text-slate-500">{activeCompany?.monedaBase || 'CRC'}</span>
          </div>

          {/* Panel Lateral de Historial */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Historial de Conversaciones
                </h4>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Volver al chat
                </button>
              </div>

              {conversaciones.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No hay conversaciones previas registradas.
                </p>
              ) : (
                <div className="space-y-2">
                  {conversaciones.map((conv) => {
                    const isSelected = conv.id === currentConversacion?.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversacion(conv)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[240px]">
                            {conv.titulo || 'Consulta en NexoSupply'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(conv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Opción {conv.categoria_opcion}:{' '}
                          {menuOptions.find((m) => m.opcion === conv.categoria_opcion)?.titulo ||
                            'Consulta General'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Área Principal del Chat */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
              {/* Si NO hay conversación activa ni mensajes, mostrar las 4 opciones obligatorias */}
              {!currentConversacion && messages.length === 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      ¡Hola, {user?.nombreCompleto?.split(' ')[0] || 'Usuario'}!
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Soy el asistente de abastecimiento para{' '}
                      <span className="font-semibold text-slate-700">
                        {activeCompany?.nombreComercial || activeCompany?.razonSocial}
                      </span>
                      . Elige un área para comenzar:
                    </p>
                  </div>

                  <div className="space-y-2">
                    {menuOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <div
                          key={opt.opcion}
                          onClick={() => handleStartCategory(opt.opcion, opt.titulo)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${opt.color} group shadow-sm`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                {opt.opcion}. {opt.titulo}
                              </h5>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                                {opt.subtitulo}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Historial de Mensajes */
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isAssistant = msg.remitente === 'ASISTENTE';
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start space-x-2 ${
                          isAssistant ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        {isAssistant && (
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-sm mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                            isAssistant
                              ? 'bg-white border border-slate-200 text-slate-800'
                              : 'bg-blue-600 text-white font-medium'
                          }`}
                        >
                          {isAssistant ? (
                            <div className="space-y-1">{formatText(msg.contenido)}</div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.contenido}</p>
                          )}
                          <span
                            className={`text-[9px] block text-right mt-1.5 ${
                              isAssistant ? 'text-slate-400' : 'text-blue-200'
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {!isAssistant && (
                          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-sm mt-0.5">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Indicador de carga */}
                  {isLoading && (
                    <div className="flex items-center space-x-2 text-slate-500 text-xs py-2 px-1">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center space-x-2 shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        <span className="text-[11px] text-slate-500 font-medium">
                          Analizando datos de {activeCompany?.nombreComercial || 'la empresa'}...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Sugerencias Rápidas si hay conversación activa */}
          {currentConversacion && !showHistory && (
            <div className="px-3 py-1.5 bg-slate-100/90 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar">
              {menuOptions
                .find((m) => m.opcion === currentConversacion.categoria_opcion)
                ?.sugerencias.slice(0, 2)
                .map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    disabled={isLoading}
                    className="text-[10px] bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 flex items-center space-x-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                    <span>{sug}</span>
                  </button>
                ))}
            </div>
          )}

          {/* Footer del Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  currentConversacion
                    ? 'Pregunta sobre órdenes, inventario o proveedores...'
                    : 'Escribe tu consulta o elige una opción...'
                }
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-slate-800 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
