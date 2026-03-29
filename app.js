(function () {
  const CONFIG = {
    wmsBase: 'https://sig-puertogaitanmeta.com/geoserver/maestria/wms',
    wfsBase: 'https://sig-puertogaitanmeta.com/geoserver/maestria/wfs',
    contactEmail: 'bejaranoa8@gmail.com',
    bbox4326: [-72.11366996201706, 4.303647041320801, -72.0746078491211, 4.330865383148193],
    layers: {
      colegios: 'maestria:Colegios',
      perimetro: 'maestria:Perimetro',
      malla: 'maestria:malla vial'
    }
  };

  const appState = {
    map: null,
    osmLayer: null,
    lyrPerimetro: null,
    lyrMalla: null,
    lyrColegios: null,
    viewExtent: null
  };

  function qs(params) {
    return Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  }

  function getMapUrl(layers) {
    const [w, s, e, n] = CONFIG.bbox4326;
    return CONFIG.wmsBase + '?' + qs({
      service: 'WMS',
      version: '1.1.1',
      request: 'GetMap',
      layers: layers,
      bbox: `${w},${s},${e},${n}`,
      width: 1000,
      height: 650,
      srs: 'EPSG:4326',
      styles: '',
      format: 'image/png',
      transparent: true
    });
  }

  function legendUrl(layer) {
    return CONFIG.wmsBase + '?' + qs({
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetLegendGraphic',
      FORMAT: 'image/png',
      LAYER: layer
    });
  }

  function wfsUrl(typeName, fmt) {
    return CONFIG.wfsBase + '?' + qs({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: typeName,
      outputFormat: fmt
    });
  }

  function kmlUrl(layer) {
    return CONFIG.wmsBase.replace(/\/wms$/i, '/wms/kml') + '?' + qs({ layers: layer });
  }

  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.panel');

  function openTab(id) {
    navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === id));
    panels.forEach(panel => panel.classList.toggle('active', panel.id === id));
    if (id === 'visor') {
      setTimeout(initMap, 120);
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      openTab(this.dataset.tab);
    });
  });

  const previews = {
    composicion: {
      url: getMapUrl([CONFIG.layers.perimetro, CONFIG.layers.malla, CONFIG.layers.colegios].join(',')),
      text: 'Composición general de las tres capas publicadas.'
    },
    colegios: {
      url: getMapUrl(CONFIG.layers.colegios),
      text: 'Capa vectorial de puntos: colegios.'
    },
    perimetro: {
      url: getMapUrl(CONFIG.layers.perimetro),
      text: 'Capa vectorial de polígonos: perímetro.'
    },
    malla: {
      url: getMapUrl(CONFIG.layers.malla),
      text: 'Capa vectorial de líneas: malla vial.'
    }
  };

  function setPreview(key) {
    const p = previews[key];
    if (!p) return;
    const img = document.getElementById('wmsImage');
    const txt = document.getElementById('activePreviewText');
    if (img) img.src = p.url;
    if (txt) txt.textContent = p.text;
  }

  document.querySelectorAll('[data-preview]').forEach(btn => {
    btn.addEventListener('click', function () {
      setPreview(this.dataset.preview);
    });
  });

  setPreview('composicion');

  const legendColegios = document.getElementById('legend-colegios');
  const legendPerimetro = document.getElementById('legend-perimetro');
  const legendMalla = document.getElementById('legend-malla');

  if (legendColegios) legendColegios.src = legendUrl(CONFIG.layers.colegios);
  if (legendPerimetro) legendPerimetro.src = legendUrl(CONFIG.layers.perimetro);
  if (legendMalla) legendMalla.src = legendUrl(CONFIG.layers.malla);

  const downloadMap = {
    'colegios-shp': wfsUrl(CONFIG.layers.colegios, 'shape-zip'),
    'colegios-kml': kmlUrl(CONFIG.layers.colegios),
    'colegios-gml': wfsUrl(CONFIG.layers.colegios, 'GML3'),
    'perimetro-shp': wfsUrl(CONFIG.layers.perimetro, 'shape-zip'),
    'perimetro-kml': kmlUrl(CONFIG.layers.perimetro),
    'perimetro-gml': wfsUrl(CONFIG.layers.perimetro, 'GML3'),
    'malla-shp': wfsUrl(CONFIG.layers.malla, 'shape-zip'),
    'malla-kml': kmlUrl(CONFIG.layers.malla),
    'malla-gml': wfsUrl(CONFIG.layers.malla, 'GML3')
  };

  Object.entries(downloadMap).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (el) el.href = url;
  });

  function updateStatus(text, color) {
    const status = document.getElementById('wms-status');
    if (!status) return;
    status.textContent = text;
    status.style.color = color || '#5a6b81';
  }

  function makeWmsTileLayer(layerName) {
    const source = new ol.source.TileWMS({
      url: CONFIG.wmsBase,
      params: {
        LAYERS: layerName,
        FORMAT: 'image/png',
        VERSION: '1.1.1',
        TRANSPARENT: true,
        STYLES: '',
        TILED: true
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous'
    });

    source.on('tileloaderror', function () {
      updateStatus('Advertencia: una capa WMS no cargó correctamente. Revisa GeoServer o el nombre publicado.', '#b45309');
    });

    source.on('tileloadend', function () {
      updateStatus('Capas WMS cargadas correctamente.', '#1f4978');
    });

    return new ol.layer.Tile({
      source: source,
      opacity: 0.92,
      visible: true
    });
  }

  function initMap() {
    const legPerWrap = document.getElementById('leg-perimetro-img');
    const legMalWrap = document.getElementById('leg-malla-img');
    const legColWrap = document.getElementById('leg-colegios-img');

    if (legPerWrap) legPerWrap.src = legendUrl(CONFIG.layers.perimetro);
    if (legMalWrap) legMalWrap.src = legendUrl(CONFIG.layers.malla);
    if (legColWrap) legColWrap.src = legendUrl(CONFIG.layers.colegios);

    if (appState.map) {
      appState.map.updateSize();
      appState.map.getView().fit(appState.viewExtent, { padding: [30, 30, 30, 30], duration: 250 });
      return;
    }

    const extent3857 = ol.proj.transformExtent(CONFIG.bbox4326, 'EPSG:4326', 'EPSG:3857');
    appState.viewExtent = extent3857;

    appState.osmLayer = new ol.layer.Tile({
      source: new ol.source.OSM(),
      visible: true
    });

    appState.lyrPerimetro = makeWmsTileLayer(CONFIG.layers.perimetro);
    appState.lyrMalla = makeWmsTileLayer(CONFIG.layers.malla);
    appState.lyrColegios = makeWmsTileLayer(CONFIG.layers.colegios);

    const view = new ol.View({
      center: ol.extent.getCenter(extent3857),
      zoom: 14,
      projection: 'EPSG:3857'
    });

    appState.map = new ol.Map({
      target: 'map',
      layers: [appState.osmLayer, appState.lyrPerimetro, appState.lyrMalla, appState.lyrColegios],
      view: view
    });

    appState.map.addControl(new ol.control.ScaleLine({
      units: 'metric',
      bar: true,
      steps: 4,
      text: true,
      minWidth: 120
    }));

    appState.map.on('pointermove', function (evt) {
      const lonLat = ol.proj.toLonLat(evt.coordinate);
      const coordsEl = document.getElementById('coords');
      if (coordsEl) {
        coordsEl.textContent = `Lat: ${lonLat[1].toFixed(6)} | Lon: ${lonLat[0].toFixed(6)}`;
      }
    });

    const chkOsm = document.getElementById('chk-osm');
    const chkPer = document.getElementById('chk-perimetro');
    const chkMal = document.getElementById('chk-malla');
    const chkCol = document.getElementById('chk-colegios');

    if (chkOsm) {
      chkOsm.addEventListener('change', function (e) {
        appState.osmLayer.setVisible(e.target.checked);
      });
    }

    if (chkPer) {
      chkPer.addEventListener('change', function (e) {
        appState.lyrPerimetro.setVisible(e.target.checked);
        const wrap = document.getElementById('leg-perimetro-wrap');
        if (wrap) wrap.style.opacity = e.target.checked ? '1' : '0.35';
      });
    }

    if (chkMal) {
      chkMal.addEventListener('change', function (e) {
        appState.lyrMalla.setVisible(e.target.checked);
        const wrap = document.getElementById('leg-malla-wrap');
        if (wrap) wrap.style.opacity = e.target.checked ? '1' : '0.35';
      });
    }

    if (chkCol) {
      chkCol.addEventListener('change', function (e) {
        appState.lyrColegios.setVisible(e.target.checked);
        const wrap = document.getElementById('leg-colegios-wrap');
        if (wrap) wrap.style.opacity = e.target.checked ? '1' : '0.35';
      });
    }

    const btnReset = document.getElementById('btnResetView');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        view.fit(extent3857, { padding: [30, 30, 30, 30], duration: 400 });
      });
    }

    setTimeout(function () {
      appState.map.updateSize();
      view.fit(extent3857, { padding: [30, 30, 30, 30] });
    }, 220);

    updateStatus('Visor inicializado. Puedes activar y desactivar capas desde el panel lateral.', '#1f4978');
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const nombre = document.getElementById('nombre').value.trim();
      const correo = document.getElementById('correo').value.trim();
      const asunto = document.getElementById('asunto').value.trim();
      const mensaje = document.getElementById('mensaje').value.trim();

      const subject = encodeURIComponent(asunto);
      const body = encodeURIComponent(`Nombre: ${nombre}\nCorreo: ${correo}\n\nMensaje:\n${mensaje}`);
      window.location.href = `mailto:${CONFIG.contactEmail}?subject=${subject}&body=${body}`;
    });
  }
})();