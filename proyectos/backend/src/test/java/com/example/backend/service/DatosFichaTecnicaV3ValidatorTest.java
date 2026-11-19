package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DatosFichaTecnicaV3ValidatorTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};
    private static final String VALID = """
        {"version_esquema":3,"categoria":"celulares",
         "variantes":[{"id":"var-1","modelo":"Ilustrativo","sku":null,"mercado":null,"identificadores":{}}],
         "especificaciones":[{"id":"display.diagonal.var-1","clave":"display.diagonal","nombre":"Diagonal","grupo":"pantalla","variante_id":"var-1","estado_dato":"conocido","justificacion_estado":null,"valor_original":{"texto":"0 in","unidad":"in"},"normalizacion":{"estado":"normalizada","valor":{"tipo":"magnitud","valor":0,"unidad":"in"},"regla_conversion_id":null,"precision":{"decimales":1}},"evidencia_ids":["ev-1"],"revision_conflicto":{"estado":"sin_conflicto","resuelto_en":null,"resuelto_por":null,"resolucion":null},"verificacion":{"estado":"con_fuente","verificado_en":null,"verificado_por":null,"evento_auditoria_id":null,"motivo_revision":null},"comparacion":{"habilitada":true,"id":"rule-1","modo":"orden_numerico","unidad":"in","direccion":"mayor_es_mejor","objetivo":null,"tolerancia":{"valor":0.1,"unidad":"in"}}}],
         "fuentes":[{"id":"src-1","tipo":"fabricante","nombre":"Fuente de prueba","url":"https://example.test/specs","localizador":"sección","consultada_en":"2026-11-19","variante_id":"var-1","mercado":"ilustrativo"}],
         "evidencias":[{"id":"ev-1","fuente_id":"src-1","alcance":{"tipo":"variante","variante_id":"var-1"},"localizador":"sección","extracto":"evidencia ilustrativa","postura":"respalda","registrada_en":"2026-11-19","registrada_por":"tester"}],"benchmarks":[]}
        """;

    private Map<String, Object> fixture() throws Exception { return MAPPER.readValue(VALID, MAP); }
    private static Map<String,Object> values(Object... pairs) { Map<String,Object> m=new java.util.LinkedHashMap<>(); for(int i=0;i<pairs.length;i+=2)m.put((String)pairs[i],pairs[i+1]); return m; }
    @SuppressWarnings("unchecked") private Map<String, Object> spec(Map<String, Object> f) { return (Map<String, Object>) ((List<?>) f.get("especificaciones")).get(0); }
    @SuppressWarnings("unchecked") private Map<String, Object> field(Map<String, Object> row, String name) { return (Map<String, Object>) row.get(name); }

    @Test void aceptaV3ValidoYValorCero() throws Exception { assertTrue(DatosFichaTecnicaV3Validator.validate(fixture()).isEmpty()); }

    @Test void rechazaVersionCategoriaYTiposIncorrectosSinExcepcionInterna() throws Exception {
        Map<String,Object> f=fixture(); f.put("version_esquema", 2); f.put("categoria", "Smartwatch");
        spec(f).put("estado_dato", 7);
        assertFalse(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
    }

    @Test void aceptaDatoOriginalConNormalizacionNoSegura() throws Exception {
        Map<String,Object> f=fixture(), s=spec(f);
        s.put("normalizacion", values("estado","no_segura","valor",null,"regla_conversion_id",null,"precision",null,"motivo","Formato ambiguo"));
        s.put("comparacion", Map.of("habilitada",false));
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
    }

    @Test void rechazaReferenciaDeEvidenciaInexistenteYVarianteInexistente() throws Exception {
        Map<String,Object> f=fixture(), s=spec(f); s.put("evidencia_ids", List.of("ausente"));
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("evidencia inexistente"));
        f=fixture(); s=spec(f); s.put("variante_id","otra");
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("variante inexistente"));
    }

    @Test void aislaRechazoDeEvidenciaDeOtraVarianteUsandoFuenteGeneral() throws Exception {
        Map<String,Object> f=fixture();
        f.put("variantes", List.of(
                values("id","var-1","modelo","M1","sku",null,"mercado",null,"identificadores",Map.of("sku","s1")),
                values("id","var-2","modelo","M2","sku",null,"mercado",null,"identificadores",Map.of("sku","s2"))
        ));
        f.put("fuentes", List.of(
                values("id","src-gen","tipo","fabricante","nombre","Fuente General","url",null,"localizador","doc",
                        "consultada_en","2026-11-19","variante_id",null,"mercado",null)
        ));
        f.put("evidencias", List.of(
                values("id","ev-var2","fuente_id","src-gen","alcance",values("tipo","variante","variante_id","var-2"),
                        "localizador","sección 2","extracto","Prueba var2","postura","respalda",
                        "registrada_en","2026-11-19","registrada_por","tester")
        ));
        Map<String,Object> s = spec(f);
        s.put("variante_id", "var-1");
        s.put("evidencia_ids", List.of("ev-var2"));

        field(s,"verificacion").put("estado","con_fuente");
        List<String> errsConFuente = DatosFichaTecnicaV3Validator.validate(f);
        assertEquals(List.of("especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación"), errsConFuente);

        field(s,"verificacion").put("estado","pendiente");
        List<String> errsPendiente = DatosFichaTecnicaV3Validator.validate(f);
        assertEquals(List.of("especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación"), errsPendiente);

        field(s,"verificacion").put("estado","verificado");
        field(s,"verificacion").put("verificado_en","2026-11-19");
        field(s,"verificacion").put("verificado_por","tester");
        field(s,"verificacion").put("evento_auditoria_id","audit-1");
        List<String> errsVerificado = DatosFichaTecnicaV3Validator.validate(f);
        assertTrue(errsVerificado.contains("especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación"));
    }

    @Test void aceptaEvidenciaGeneralConTodasLasVariantesParaEspecificacionDeVariante() throws Exception {
        Map<String,Object> f=fixture();
        f.put("variantes", List.of(
                values("id","var-1","modelo","M1","sku",null,"mercado",null,"identificadores",Map.of("sku","s1")),
                values("id","var-2","modelo","M2","sku",null,"mercado",null,"identificadores",Map.of("sku","s2"))
        ));
        f.put("fuentes", List.of(
                values("id","src-gen","tipo","fabricante","nombre","Fuente General","url",null,"localizador","doc",
                        "consultada_en","2026-11-19","variante_id",null,"mercado",null)
        ));
        f.put("evidencias", List.of(
                values("id","ev-gen","fuente_id","src-gen",
                        "alcance",values("tipo","todas_las_variantes","variante_ids",List.of("var-1","var-2")),
                        "localizador","sección gral","extracto","Prueba gral","postura","respalda",
                        "registrada_en","2026-11-19","registrada_por","tester")
        ));
        Map<String,Object> s = spec(f);
        s.put("variante_id", "var-1");
        s.put("evidencia_ids", List.of("ev-gen"));
        field(s,"verificacion").put("estado","con_fuente");
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());

        ((Map<String,Object>)((Map<String,Object>)((List<?>)f.get("evidencias")).get(0)).get("alcance"))
                .put("variante_ids", List.of("var-2"));
        List<String> errsSinVar = DatosFichaTecnicaV3Validator.validate(f);
        assertEquals(List.of("especificaciones[0].evidencia_ids: la evidencia no cubre la variante de la especificación"), errsSinVar);
    }

    @Test void rechazaConflictoPendienteConDatoVerificado() throws Exception {
        Map<String,Object> f=fixture(), s=spec(f);
        s.put("revision_conflicto",values("estado","conflicto_pendiente","resuelto_en",null,"resuelto_por",null,"resolucion",null));
        Map<String,Object> verification=field(s,"verificacion"); verification.put("estado","verificado"); verification.put("verificado_en","2026-11-19"); verification.put("verificado_por","tester"); verification.put("evento_auditoria_id","audit-1");
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("conflicto pendiente"));
    }

    @Test void rechazaToleranciaConUnidadIncompatible() throws Exception {
        Map<String,Object> f=fixture(); field(spec(f),"comparacion").put("tolerancia",Map.of("valor",1,"unidad","mm"));
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("tolerancia"));
    }

    @Test void rechazaFormaDeValorInvalidaYComparacionDeTextoComoMagnitud() throws Exception {
        Map<String,Object> f=fixture(), s=spec(f);
        field(s,"normalizacion").put("valor",Map.of("tipo","texto","valor","valor"));
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("magnitud escalar"));
    }

    @Test void aceptaAtomosListasSecuencialesYPrecisionNula() throws Exception {
        List<Map<String,Object>> atoms=List.of(values("tipo","texto","valor","USB-C"), values("tipo","numero","valor",0),
                values("tipo","booleano","valor",true), values("tipo","magnitud","valor",0,"unidad","mm"));
        for (Map<String,Object> atom : atoms) {
            Map<String,Object> f=fixture(), s=spec(f); field(s,"normalizacion").put("valor",atom);
            field(s,"comparacion").put("habilitada",false); field(s,"normalizacion").put("precision",values("decimales",null));
            assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty(), atom.toString());
        }
        Map<String,Object> f=fixture(), s=spec(f);
        field(s,"normalizacion").put("valor",values("tipo","lista","semantica","secuencia","tipo_elemento","numero","elementos",List.of(values("tipo","numero","valor",1),values("tipo","numero","valor",1))));
        field(s,"comparacion").put("habilitada",false);
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
    }

    @Test void rechazaDuplicadosEnConjuntoYValidaUnidadesDeListas() throws Exception {
        Map<String,Object> f=fixture(), s=spec(f);
        field(s,"normalizacion").put("valor",values("tipo","lista","semantica","conjunto","tipo_elemento","texto","elementos",List.of(values("tipo","texto","valor","A"),values("tipo","texto","valor","A"))));
        field(s,"comparacion").put("habilitada",false);
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("duplicados"));
        f=fixture();s=spec(f);
        field(s,"normalizacion").put("valor",values("tipo","lista","semantica","secuencia","tipo_elemento","magnitud","elementos",List.of(values("tipo","magnitud","valor",1,"unidad","mm"),values("tipo","magnitud","valor",2,"unidad","cm"))));
        field(s,"comparacion").put("habilitada",false);
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("misma unidad"));
    }

    @Test void validaDimensionesResolucionesYRangos() throws Exception {
        for (Map<String,Object> value : List.of(
                values("tipo","dimensiones","ejes",List.of(values("eje","alto","magnitud",values("valor",100,"unidad","mm")),values("eje","ancho","magnitud",values("valor",50,"unidad","mm")))),
                values("tipo","resolucion","ancho",1920,"alto",1080,"unidad","px"),
                values("tipo","rango","minimo",values("valor",1,"unidad","GHz"),"maximo",values("valor",3,"unidad","GHz")))) {
            Map<String,Object> f=fixture(), s=spec(f); field(s,"normalizacion").put("valor",value); field(s,"comparacion").put("habilitada",false);
            assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty(), value.toString());
        }
        Map<String,Object> f=fixture(), s=spec(f);
        field(s,"normalizacion").put("valor",values("tipo","rango","minimo",values("valor",4,"unidad","GHz"),"maximo",values("valor",2,"unidad","GHz")));
        field(s,"comparacion").put("habilitada",false);
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("mínimo"));
    }

    @Test void limitaProfundidadDeCompuestos() throws Exception {
        Map<String,Object> level1=values("tipo","compuesto","componentes",List.of(values("clave","a","nombre","A","valor",values("tipo","texto","valor","x"))));
        Map<String,Object> level2=values("tipo","compuesto","componentes",List.of(values("clave","b","nombre","B","valor",level1)));
        Map<String,Object> level3=values("tipo","compuesto","componentes",List.of(values("clave","c","nombre","C","valor",level2)));
        Map<String,Object> f=fixture(),s=spec(f); field(s,"normalizacion").put("valor",level3);field(s,"comparacion").put("habilitada",false);
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
        Map<String,Object> level4=values("tipo","compuesto","componentes",List.of(values("clave","d","nombre","D","valor",level3)));
        field(s,"normalizacion").put("valor",level4);
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("profundidad"));
    }

    @Test void validaJustificacionNoAplicaYMotivoRequiereRevision() throws Exception {
        Map<String,Object> f=fixture(),s=spec(f);
        s.put("estado_dato","no_aplica");s.put("justificacion_estado","La característica no aplica a esta variante");
        s.put("valor_original",null);
        s.put("normalizacion",values("estado","no_procesada","valor",null,"regla_conversion_id",null,"precision",null));
        field(s,"comparacion").put("habilitada",false);
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
        s.put("justificacion_estado",null);
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("justificación"));

        f=fixture();s=spec(f);field(s,"verificacion").put("estado","requiere_revision");field(s,"verificacion").put("motivo_revision","Revisar la variante");
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
    }

    @Test void rechazaNullsRequeridosOmitidosEnLugarDeNullExplicito() throws Exception {
        Map<String,Object> f=fixture(),s=spec(f);field(s,"normalizacion").remove("precision");
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("precision"));
        f=fixture();s=spec(f);s.remove("valor_original");s.put("estado_dato","desconocido");
        field(s,"normalizacion").put("estado","no_procesada");field(s,"normalizacion").put("valor",null);field(s,"normalizacion").put("regla_conversion_id",null);field(s,"normalizacion").put("precision",null);
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("valor_original"));
    }

    @Test void validaReglaConversionEnBenchmarks() throws Exception {
        Map<String,Object> f=fixture();
        Map<String,Object> bm = values("id","bm-1","nombre_prueba","Prueba","version","1","plataforma","Android",
                "modo_ejecucion","default","resultado_original",values("texto","10 puntos","unidad","puntos"),
                "resultado",values("valor",10,"unidad","puntos"),"regla_conversion_id",null,"fecha_ejecucion","2026-11-19",
                "fuente_id","src-1","evidencia_id","ev-1","variante_id","var-1",
                "verificacion",values("estado","con_fuente","verificado_en",null,"verificado_por",null,"evento_auditoria_id",null,"motivo_revision",null),
                "revision_conflicto",values("estado","sin_conflicto","resuelto_en",null,"resuelto_por",null,"resolucion",null));
        f.put("benchmarks", List.of(bm));
        assertTrue(DatosFichaTecnicaV3Validator.validate(f).isEmpty());
        bm.remove("regla_conversion_id");
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("regla_conversion_id"));
        bm.put("regla_conversion_id"," ");
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("regla_conversion_id"));

        // Benchmark con evidencia de otra variante
        f=fixture();
        f.put("variantes", List.of(
                values("id","var-1","modelo","M1","sku",null,"mercado",null,"identificadores",Map.of("sku","s1")),
                values("id","var-2","modelo","M2","sku",null,"mercado",null,"identificadores",Map.of("sku","s2"))
        ));
        f.put("fuentes", List.of(
                values("id","src-gen","tipo","benchmark","nombre","Fuente General","url",null,"localizador","doc",
                        "consultada_en","2026-11-19","variante_id",null,"mercado",null)
        ));
        f.put("evidencias", List.of(
                values("id","ev-var2","fuente_id","src-gen","alcance",values("tipo","variante","variante_id","var-2"),
                        "localizador","sección 2","extracto","Prueba var2","postura","respalda",
                        "registrada_en","2026-11-19","registrada_por","tester")
        ));
        Map<String,Object> bmOtraVar = values("id","bm-2","nombre_prueba","Prueba 2","version","1","plataforma","Android",
                "modo_ejecucion","default","resultado_original",values("texto","10 puntos","unidad","puntos"),
                "resultado",values("valor",10,"unidad","puntos"),"regla_conversion_id",null,"fecha_ejecucion","2026-11-19",
                "fuente_id","src-gen","evidencia_id","ev-var2","variante_id","var-1",
                "verificacion",values("estado","con_fuente","verificado_en",null,"verificado_por",null,"evento_auditoria_id",null,"motivo_revision",null),
                "revision_conflicto",values("estado","sin_conflicto","resuelto_en",null,"resuelto_por",null,"resolucion",null));
        f.put("benchmarks", List.of(bmOtraVar));
        assertTrue(String.join(" ",DatosFichaTecnicaV3Validator.validate(f)).contains("variante exacta"));
    }
}
