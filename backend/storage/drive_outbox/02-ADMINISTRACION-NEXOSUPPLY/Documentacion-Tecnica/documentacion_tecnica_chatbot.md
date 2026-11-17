# ARQUITECTURA TECNICA DEL CHATBOT DOCUMENTAL RAG

### Principio de Operacion:
El asistente virtual no realiza consultas directas a las tablas de MySQL para formular respuestas empresariales. Su base de conocimiento procede de los documentos archivados en Google Drive e indexados en Qdrant.

### Flujo de Consulta:
1. El usuario envia una pregunta a traves del widget de chat.
2. El sistema valida la sesion y resuelve el contexto de la empresa activa.
3. Se genera el vector de consulta con MiniLM-L6-v2 (384 dimensiones).
4. Se ejecuta busqueda semantica en Qdrant con filtro obligatorio `empresa_id`.
5. Si no hay evidencia documental, el sistema responde que no existe suficiente informacion.
6. Si hay evidencia, se sintetiza la respuesta con citas directas al documento original y numero de fragmento.
