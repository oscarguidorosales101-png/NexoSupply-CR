async function testHttpEndpoints() {
  console.log('================================================================');
  console.log('NEXOSUPPLY CR - VERIFICACION HTTP END-TO-END DE CONOCIMIENTO');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Frontend Vite Dev Server
  console.log('\n--- 1. Frontend Vite Server (Puerto 5173) ---');
  try {
    const resFront = await fetch('http://localhost:5173/');
    assert(resFront.ok, `Frontend respondiendo HTTP ${resFront.status} OK`);
    const html = await resFront.text();
    assert(html.includes('<div id="root"></div>'), 'HTML raíz contiene montaje <div id="root">');
  } catch (err: any) {
    assert(false, `Error conectando con frontend: ${err.message}`);
  }

  // 2. Backend Health Check
  console.log('\n--- 2. Backend Server (Puerto 4000) ---');
  try {
    const resHealth = await fetch('http://localhost:4000/health');
    assert(resHealth.ok, `Health check respondiendo HTTP ${resHealth.status} OK`);
  } catch (err: any) {
    assert(false, `Error conectando con backend: ${err.message}`);
  }

  // 3. Login y Cookie de Sesión
  console.log('\n--- 3. Autenticacion Administrador Demo ---');
  let authCookie = '';
  try {
    const resLogin = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pacificocr-demo.com',
        password: 'DemoPacifico2026!',
      }),
    });
    assert(resLogin.ok, `Login exitoso HTTP ${resLogin.status}`);
    const rawCookies = resLogin.headers.get('set-cookie');
    if (rawCookies) {
      authCookie = rawCookies.split(';')[0];
      assert(authCookie.startsWith('token='), 'Cookie HttpOnly JWT generada correctamente');
    } else {
      const loginBody: any = await resLogin.json();
      if (loginBody.data?.accessToken) {
        authCookie = `token=${loginBody.data.accessToken}`;
        assert(true, 'Token JWT obtenido en body de respuesta');
      }
    }
  } catch (err: any) {
    assert(false, `Error durante login: ${err.message}`);
  }

  if (!authCookie) {
    console.error('[FATAL] No se pudo obtener sesión para pruebas subsiguientes.');
    process.exit(1);
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Cookie: authCookie,
    'X-Empresa-Id': 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
  };

  // 4. Endpoint Estado Conocimiento (/api/v1/conocimiento/estado)
  console.log('\n--- 4. Endpoint /api/v1/conocimiento/estado ---');
  try {
    const resEstado = await fetch('http://localhost:4000/api/v1/conocimiento/estado', {
      headers: defaultHeaders,
    });
    assert(resEstado.ok, `GET /conocimiento/estado respondió HTTP ${resEstado.status}`);
    const estadoJson: any = await resEstado.json();
    assert(estadoJson.success === true, 'Respuesta JSON con success: true');
    assert(estadoJson.data !== undefined, 'Respuesta incluye payload en propiedad data');
    const data = estadoJson.data;
    assert(data.drive?.conectado === true, 'Google Drive Service Account reporta conectado: true');
    assert(data.drive?.serviceAccountEmail !== undefined, 'Reporta serviceAccountEmail correctamente');
    assert(data.oauth?.conectado === false, 'OAuth 2.0 reporta conectado: false (pendiente autorizar)');
    assert(data.vectorStore?.qdrantActivo === false, 'Qdrant reporta qdrantActivo: false (modo seguro sin caídas)');
    assert(typeof data.metricas?.totalDocumentos === 'number', 'Métricas de documentos es numérica');
  } catch (err: any) {
    assert(false, `Error en endpoint /conocimiento/estado: ${err.message}`);
  }

  // 5. Endpoint Carpetas (/api/v1/conocimiento/carpetas)
  console.log('\n--- 5. Endpoint /api/v1/conocimiento/carpetas ---');
  try {
    const resCarpetas = await fetch('http://localhost:4000/api/v1/conocimiento/carpetas', {
      headers: defaultHeaders,
    });
    assert(resCarpetas.ok, `GET /conocimiento/carpetas respondió HTTP ${resCarpetas.status}`);
    const carpJson: any = await resCarpetas.json();
    assert(Array.isArray(carpJson.data), `Carpetas es un Array válido (Longitud: ${carpJson.data?.length})`);
    assert(carpJson.data.length > 0, 'Carpetas no está vacío');
  } catch (err: any) {
    assert(false, `Error en endpoint /conocimiento/carpetas: ${err.message}`);
  }

  // 6. Endpoint Documentos (/api/v1/conocimiento/documentos)
  console.log('\n--- 6. Endpoint /api/v1/conocimiento/documentos ---');
  try {
    const resDocs = await fetch('http://localhost:4000/api/v1/conocimiento/documentos', {
      headers: defaultHeaders,
    });
    assert(resDocs.ok, `GET /conocimiento/documentos respondió HTTP ${resDocs.status}`);
    const docsJson: any = await resDocs.json();
    assert(Array.isArray(docsJson.data), `Documentos es un Array válido (Longitud: ${docsJson.data?.length})`);
    assert(docsJson.data.length > 0, 'Documentos no está vacío');
    const primerDoc = docsJson.data[0];
    assert(typeof primerDoc.nombre === 'string', `Primer documento tiene nombre: ${primerDoc.nombre}`);
    assert(typeof primerDoc.tamanio_bytes === 'number', `Tamaño en bytes formateado como número (${primerDoc.tamanio_bytes})`);
  } catch (err: any) {
    assert(false, `Error en endpoint /conocimiento/documentos: ${err.message}`);
  }

  // 7. Endpoint Historial Sincronizaciones (/api/v1/conocimiento/sincronizaciones)
  console.log('\n--- 7. Endpoint /api/v1/conocimiento/sincronizaciones ---');
  try {
    const resHist = await fetch('http://localhost:4000/api/v1/conocimiento/sincronizaciones', {
      headers: defaultHeaders,
    });
    assert(resHist.ok, `GET /conocimiento/sincronizaciones respondió HTTP ${resHist.status}`);
    const histJson: any = await resHist.json();
    assert(Array.isArray(histJson.data), `Historial es un Array válido (Longitud: ${histJson.data?.length})`);
  } catch (err: any) {
    assert(false, `Error en endpoint /conocimiento/sincronizaciones: ${err.message}`);
  }

  // 8. Endpoint OAuth Status (/api/v1/conocimiento/oauth/status)
  console.log('\n--- 8. Endpoint /api/v1/conocimiento/oauth/status ---');
  try {
    const resOauth = await fetch('http://localhost:4000/api/v1/conocimiento/oauth/status', {
      headers: defaultHeaders,
    });
    assert(resOauth.ok, `GET /conocimiento/oauth/status respondió HTTP ${resOauth.status}`);
    const oauthJson: any = await resOauth.json();
    assert(oauthJson.data?.raizAutorizada === '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1', 'Raíz autorizada reportada en status');
  } catch (err: any) {
    assert(false, `Error en endpoint /conocimiento/oauth/status: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`RESULTADO DE LA VERIFICACION HTTP: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testHttpEndpoints();
