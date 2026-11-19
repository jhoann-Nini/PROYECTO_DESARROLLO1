package com.example.backend.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Validación estructural del contrato DatosFichaTecnicaV3 sobre el JSON recibido. */
public final class DatosFichaTecnicaV3Validator {
    private static final Set<String> CATEGORIAS = Set.of("celulares", "tablets", "portatiles", "auriculares");
    private static final Set<String> ESTADOS_DATO = Set.of("conocido", "desconocido", "no_publicado", "no_aplica");
    private static final Set<String> ESTADOS_VERIFICACION = Set.of("pendiente", "con_fuente", "verificado", "requiere_revision");
    private static final Set<String> UNIDADES = Set.of("B", "kB", "MB", "GB", "TB", "KiB", "MiB", "GiB", "TiB",
            "mm", "cm", "in", "px", "Hz", "kHz", "MHz", "GHz", "bit/s", "kbit/s", "Mbit/s",
            "mAh", "Ah", "mWh", "Wh", "kWh", "mg", "g", "kg", "mW", "W", "ms", "s", "min", "h",
            "mpx", "puntos", "%", "nits", "dB");
    private static final Set<String> UNIDADES_LONGITUD = Set.of("mm", "cm", "in");
    private static final Set<String> TIPOS_FUENTE = Set.of("fabricante", "organismo", "comercio", "analisis", "benchmark", "otro");
    private final List<String> errors = new ArrayList<>();

    private DatosFichaTecnicaV3Validator() {}

    public static List<String> validate(Map<String, Object> ficha) {
        DatosFichaTecnicaV3Validator v = new DatosFichaTecnicaV3Validator();
        v.root(ficha);
        return List.copyOf(v.errors);
    }

    private void root(Map<String, Object> f) {
        if (f == null) { err("caracteristicas", "debe ser un objeto V3"); return; }
        if (!integer(f.get("version_esquema")) || number(f.get("version_esquema")).intValue() != 3)
            err("version_esquema", "debe ser exactamente 3");
        if (!member(CATEGORIAS, f.get("categoria"))) err("categoria", "categoría V3 no soportada");
        List<?> variants = array(f, "variantes"), specs = array(f, "especificaciones"), sources = array(f, "fuentes"), evidence = array(f, "evidencias"), benchmarks = array(f, "benchmarks");
        if (variants == null || specs == null || sources == null || evidence == null || benchmarks == null) return;

        Set<String> variantIds = ids(variants, "variantes");
        Set<String> sourceIds = ids(sources, "fuentes");
        Set<String> evidenceIds = ids(evidence, "evidencias");
        ids(benchmarks, "benchmarks");
        Map<String, Map<String, Object>> evidenceById = objectsById(evidence);
        Map<String, Map<String, Object>> sourceById = objectsById(sources);
        validateVariants(variants);
        validateSources(sources, variantIds);
        validateEvidence(evidence, sourceById, variantIds);
        validateSpecs(specs, variantIds, evidenceIds, evidenceById);
        validateBenchmarks(benchmarks, variantIds, sourceIds, evidenceById);
    }

    private void validateVariants(List<?> rows) {
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> v = obj(rows.get(i)); if (v == null) { err("variantes["+i+"]", "debe ser un objeto"); continue; }
            for (String field : List.of("modelo", "sku", "mercado")) if (!v.containsKey(field) || !nullableText(v.get(field))) err("variantes["+i+"]."+field, "debe ser texto o null");
            Map<String,Object> identifiers = obj(v.get("identificadores"));
            if (identifiers == null || identifiers.values().stream().anyMatch(x -> !text(x))) err("variantes["+i+"].identificadores", "debe ser un mapa de textos no vacíos");
        }
    }

    private void validateSources(List<?> rows, Set<String> variants) {
        for (int i=0;i<rows.size();i++) {
            Map<String,Object> s=obj(rows.get(i)); if(s==null) continue; String p="fuentes["+i+"]";
            if(!text(s.get("nombre")) || !member(TIPOS_FUENTE, s.get("tipo"))) err(p,"nombre o tipo de fuente inválido");
            if(!hasNullableText(s,"url","localizador","consultada_en","variante_id","mercado")) err(p,"campos textuales inválidos");
            if(s.get("variante_id")!=null && !variants.contains(s.get("variante_id"))) err(p+".variante_id","variante inexistente");
        }
    }

    private void validateEvidence(List<?> rows, Map<String,Map<String,Object>> sources, Set<String> variants) {
        for(int i=0;i<rows.size();i++) {
            Map<String,Object> ev=obj(rows.get(i)); if(ev==null) continue; String p="evidencias["+i+"]";
            Map<String,Object> src=sources.get(ev.get("fuente_id")); if(src==null) err(p+".fuente_id","fuente inexistente");
            Map<String,Object> scope=obj(ev.get("alcance"));
            if(scope==null) err(p+".alcance","alcance obligatorio");
            else if("variante".equals(scope.get("tipo"))) {
                if(!variants.contains(scope.get("variante_id"))) err(p+".alcance.variante_id","variante inexistente");
                if(src!=null && text(src.get("variante_id")) && !src.get("variante_id").equals(scope.get("variante_id"))) err(p+".alcance","el alcance contradice la variante declarada por la fuente");
            } else if("todas_las_variantes".equals(scope.get("tipo"))) {
                List<?> ids=list(scope.get("variante_ids"));
                if(ids==null || ids.stream().anyMatch(id->!variants.contains(id))) err(p+".alcance.variante_ids","debe enumerar variantes existentes");
                if(src!=null && text(src.get("variante_id"))) err(p+".alcance","una fuente de variante única no puede cubrir todas las variantes");
            } else err(p+".alcance.tipo","tipo de alcance inválido");
            if(!member(Set.of("respalda","contradice","contexto"),ev.get("postura"))) err(p+".postura","postura inválida");
            if(!text(ev.get("registrada_en"))) err(p+".registrada_en","fecha requerida");
            if(!hasNullableText(ev,"localizador","extracto","registrada_por")) err(p,"campos textuales inválidos");
            if(!text(ev.get("localizador")) && !text(ev.get("extracto"))) err(p,"evidencia requiere localizador o extracto concreto");
        }
    }

    private void validateSpecs(List<?> rows, Set<String> variants, Set<String> evidenceIds, Map<String,Map<String,Object>> evidence) {
        Set<String> specIds=new HashSet<>(), keys=new HashSet<>();
        for(int i=0;i<rows.size();i++) {
            Map<String,Object> s=obj(rows.get(i)); String p="especificaciones["+i+"]"; if(s==null){err(p,"debe ser un objeto");continue;}
            for(String field:List.of("id","clave","nombre","grupo")) if(!text(s.get(field))) err(p+"."+field,"campo obligatorio");
            if(text(s.get("id"))&&!specIds.add((String)s.get("id"))) err(p+".id","id de especificación duplicado");
            String key=String.valueOf(s.get("variante_id"))+":"+String.valueOf(s.get("clave")); if(!keys.add(key)) err(p+".clave","clave duplicada para la misma variante");
            if(s.get("variante_id")!=null&&!variants.contains(s.get("variante_id"))) err(p+".variante_id","variante inexistente");
            String state=string(s.get("estado_dato")); if(!member(ESTADOS_DATO,state)) err(p+".estado_dato","estado del dato inválido");
            if("no_aplica".equals(state)&&!text(s.get("justificacion_estado"))) err(p+".justificacion_estado","no_aplica requiere justificación");
            if(!s.containsKey("justificacion_estado")||!s.containsKey("variante_id")) err(p,"variante_id y justificacion_estado deben declararse como texto o null");
            if(s.get("justificacion_estado")!=null&&!nullableText(s.get("justificacion_estado"))) err(p+".justificacion_estado","debe ser texto o null");
            Map<String,Object> original=obj(s.get("valor_original"));
            boolean originalOk=original!=null&&text(original.get("texto"))&&original.containsKey("unidad")&&nullableText(original.get("unidad"));
            if("conocido".equals(state)&&!originalOk) err(p+".valor_original","dato conocido requiere el valor original");
            if(!"conocido".equals(state)&&(!s.containsKey("valor_original")||s.get("valor_original")!=null)) err(p+".valor_original","dato ausente debe declarar valor_original null");
            validateNormalization(s.get("normalizacion"),state,p);
            List<?> evIds=list(s.get("evidencia_ids")); if(evIds==null) err(p+".evidencia_ids","debe ser un arreglo"); else for(Object id:evIds) if(!evidenceIds.contains(id)) err(p+".evidencia_ids","evidencia inexistente: "+id);
            validateConflict(s.get("revision_conflicto"),p+".revision_conflicto");
            Map<String,Object> conflict=obj(s.get("revision_conflicto")), ver=obj(s.get("verificacion"));
            List<Map<String,Object>> linked=new ArrayList<>(); if(evIds!=null) for(Object id:evIds) if(evidence.containsKey(id)) linked.add(evidence.get(id));
            for(Map<String,Object> ev:linked) if(!compatible(obj(ev.get("alcance")),s.get("variante_id"),variants)) err(p+".evidencia_ids","la evidencia no cubre la variante de la especificación");
            boolean contradiction=linked.stream().anyMatch(ev->"contradice".equals(ev.get("postura")));
            if(contradiction&&(conflict==null||!"conflicto_resuelto".equals(conflict.get("estado")))) err(p+".revision_conflicto","la evidencia contradictoria requiere conflicto_resuelto");
            if(ver==null||!member(ESTADOS_VERIFICACION,ver.get("estado"))) err(p+".verificacion","estado de verificación inválido");
            else validateVerification(ver,state,conflict,linked,s.get("variante_id"),variants,p+".verificacion");
            validateComparison(s.get("comparacion"),s.get("normalizacion"),p+".comparacion");
        }
    }

    private void validateNormalization(Object raw,String state,String p) {
        Map<String,Object> n=obj(raw); if(n==null||!member(Set.of("normalizada","no_segura","no_procesada"),n.get("estado"))){err(p+".normalizacion","estado de normalización inválido");return;}
        String ns=string(n.get("estado"));
        if("conocido".equals(state)) {
            if("normalizada".equals(ns)) {
                validateValue(n.get("valor"),p+".normalizacion.valor",1);
                if(!n.containsKey("regla_conversion_id")) err(p+".normalizacion.regla_conversion_id","campo requerido");
                if(n.get("regla_conversion_id")!=null&&!text(n.get("regla_conversion_id"))) err(p+".normalizacion.regla_conversion_id","debe ser un id no vacío o null");
                if(!n.containsKey("precision")) err(p+".normalizacion.precision","campo requerido");
                Map<String,Object> precision=obj(n.get("precision"));
                if(precision!=null&&!precision.containsKey("decimales")) err(p+".normalizacion.precision.decimales","campo requerido");
                if(n.get("precision")!=null&&(precision==null||(precision.get("decimales")!=null&&(!(precision.get("decimales") instanceof Number d)||!Double.isFinite(d.doubleValue())||!integer(d)||d.doubleValue()<0)))) err(p+".normalizacion.precision","decimales debe ser entero no negativo o null");
            } else if("no_segura".equals(ns)) {
                if(!n.containsKey("valor")||!n.containsKey("regla_conversion_id")||!n.containsKey("precision")||n.get("valor")!=null||n.get("regla_conversion_id")!=null||n.get("precision")!=null||!text(n.get("motivo"))) err(p+".normalizacion","no_segura requiere nulls y motivo");
            } else err(p+".normalizacion","dato conocido no puede quedar no_procesada");
        } else if(!"no_procesada".equals(ns)||!n.containsKey("valor")||!n.containsKey("regla_conversion_id")||!n.containsKey("precision")||n.get("valor")!=null||n.get("regla_conversion_id")!=null||n.get("precision")!=null) err(p+".normalizacion","dato ausente requiere no_procesada y valores null");
    }

    private void validateVerification(Map<String,Object> v,String dataState,Map<String,Object> conflict,List<Map<String,Object>> evidence,Object variant,Set<String> variants,String p) {
        String state=(String)v.get("estado");
        for(String field:List.of("verificado_en","verificado_por","evento_auditoria_id","motivo_revision")) if(!v.containsKey(field)||!nullableText(v.get(field))) err(p+"."+field,"debe ser texto o null");
        if("requiere_revision".equals(state)&&!text(v.get("motivo_revision"))) err(p+".motivo_revision","requiere_revision necesita motivo");
        if("con_fuente".equals(state)&&evidence.isEmpty()) err(p,"con_fuente requiere al menos una evidencia enlazada");
        if("verificado".equals(state)) {
            if(!"conocido".equals(dataState)) err(p,"solo un dato conocido puede marcarse verificado");
            if(!text(v.get("verificado_en"))||!text(v.get("verificado_por"))||!text(v.get("evento_auditoria_id"))) err(p,"verificado requiere fecha, responsable y evento de auditoría");
            if(conflict!=null&&"conflicto_pendiente".equals(conflict.get("estado"))) err(p,"un conflicto pendiente impide verificar");
            List<Map<String,Object>> supports=evidence.stream().filter(ev->"respalda".equals(ev.get("postura"))).toList();
            if(supports.isEmpty()) err(p,"verificado requiere evidencia que respalde el dato");
        }
    }

    private boolean compatible(Map<String,Object> scope,Object variant,Set<String> variants) {
        if(scope==null) return false;
        if(variant!=null) {
            if("variante".equals(scope.get("tipo"))) return variant.equals(scope.get("variante_id"));
            if("todas_las_variantes".equals(scope.get("tipo"))) {
                List<?> ids=list(scope.get("variante_ids"));
                return ids!=null && ids.contains(variant);
            }
            return false;
        }
        List<?> ids=list(scope.get("variante_ids"));
        return "todas_las_variantes".equals(scope.get("tipo"))&&ids!=null&&!variants.isEmpty()&&ids.containsAll(variants);
    }

    private void validateConflict(Object raw,String p) {
        Map<String,Object> c=obj(raw); if(c==null||!member(Set.of("sin_conflicto","conflicto_pendiente","conflicto_resuelto"),c.get("estado"))){err(p,"revisión de conflicto inválida");return;}
        if(!hasNullableText(c,"resuelto_en","resuelto_por","resolucion")) err(p,"los campos de resolución deben ser texto o null y estar presentes");
        if("conflicto_pendiente".equals(c.get("estado"))&&(!c.containsKey("resolucion")||!c.containsKey("resuelto_en")||!c.containsKey("resuelto_por")||c.get("resolucion")!=null||c.get("resuelto_en")!=null||c.get("resuelto_por")!=null)) err(p,"conflicto pendiente no puede declarar resolución; los campos de resolución deben ser null");
        if("conflicto_resuelto".equals(c.get("estado"))&&(!text(c.get("resolucion"))||!text(c.get("resuelto_en"))||!text(c.get("resuelto_por")))) err(p,"conflicto resuelto requiere resolución, fecha y responsable");
    }

    private void validateBenchmarks(List<?> rows,Set<String> variants,Set<String> sources,Map<String,Map<String,Object>> evidence) {
        for(int i=0;i<rows.size();i++) {
            Map<String,Object>b=obj(rows.get(i));if(b==null)continue;String p="benchmarks["+i+"]";
            Map<String,Object> result=obj(b.get("resultado")), original=obj(b.get("resultado_original"));
            if(!text(b.get("nombre_prueba"))||result==null||!finite(result.get("valor"))||!member(UNIDADES,result.get("unidad"))) err(p,"benchmark requiere nombre y resultado numérico finito con unidad");
            if(original==null||!text(original.get("texto"))||!original.containsKey("unidad")||!nullableText(original.get("unidad"))) err(p+".resultado_original","resultado original inválido");
            for(String f:List.of("version","plataforma","modo_ejecucion","fecha_ejecucion","regla_conversion_id")) if(!b.containsKey(f)||!nullableText(b.get(f))) err(p+"."+f,"debe ser texto o null");
            if(b.get("regla_conversion_id")!=null&&!text(b.get("regla_conversion_id"))) err(p+".regla_conversion_id","debe ser un id no vacío o null");
            if(!sources.contains(b.get("fuente_id"))) err(p+".fuente_id","fuente inexistente");
            Map<String,Object> ev=evidence.get(b.get("evidencia_id")); if(ev==null)err(p+".evidencia_id","evidencia inexistente");
            if(ev!=null&&!java.util.Objects.equals(ev.get("fuente_id"),b.get("fuente_id")))err(p+".evidencia_id","la evidencia debe pertenecer a la fuente declarada por el benchmark");
            if(!variants.contains(b.get("variante_id")))err(p+".variante_id","variante inexistente");
            if(ev!=null){Map<String,Object>scope=obj(ev.get("alcance"));if(scope==null||!"variante".equals(scope.get("tipo"))||!java.util.Objects.equals(scope.get("variante_id"),b.get("variante_id")))err(p+".evidencia_id","benchmark requiere evidencia de su variante exacta");}
            Map<String,Object> conflict=obj(b.get("revision_conflicto")), verification=obj(b.get("verificacion")); validateConflict(conflict,p+".revision_conflicto");
            if(verification==null||!member(ESTADOS_VERIFICACION,verification.get("estado")))err(p+".verificacion","estado de verificación inválido");
            else {
                for(String field:List.of("verificado_en","verificado_por","evento_auditoria_id","motivo_revision")) if(!verification.containsKey(field)||!nullableText(verification.get(field))) err(p+".verificacion."+field,"debe ser texto o null");
                String vs=(String)verification.get("estado");
                if("requiere_revision".equals(vs)&&!text(verification.get("motivo_revision")))err(p+".verificacion","requiere_revision necesita motivo");
                if("con_fuente".equals(vs)&&ev==null)err(p+".verificacion","con_fuente requiere evidencia enlazada");
                if(ev!=null&&"contradice".equals(ev.get("postura"))&&(conflict==null||!"conflicto_resuelto".equals(conflict.get("estado"))))err(p+".revision_conflicto","la evidencia contradictoria requiere conflicto_resuelto");
                if("verificado".equals(vs)&&(conflict!=null&&"conflicto_pendiente".equals(conflict.get("estado"))))err(p+".verificacion","conflicto pendiente impide verificar benchmark");
                if("verificado".equals(vs)&&(ev==null||!"respalda".equals(ev.get("postura"))||!text(verification.get("verificado_por"))||!text(verification.get("verificado_en"))||!text(verification.get("evento_auditoria_id"))))err(p+".verificacion","benchmark verificado requiere evidencia de respaldo y auditoría");
            }
        }
    }

    private void validateComparison(Object raw,Object normalization,String p) {
        Map<String,Object> r=obj(raw); if(r==null||!(r.get("habilitada") instanceof Boolean)){err(p,"regla de comparación inválida");return;}
        if(Boolean.FALSE.equals(r.get("habilitada")))return;
        if(!text(r.get("id")))err(p+".id","id de regla obligatorio");
        Map<String,Object> n=obj(normalization);
        if("orden_numerico".equals(r.get("modo"))) {
            if(!r.containsKey("objetivo")||!r.containsKey("tolerancia"))err(p,"objetivo y tolerancia deben declararse explícitamente");
            if(!member(UNIDADES,r.get("unidad")))err(p+".unidad","unidad de comparación inválida");
            if(!member(Set.of("mayor_es_mejor","menor_es_mejor","objetivo"),r.get("direccion")))err(p+".direccion","dirección inválida");
            if("objetivo".equals(r.get("direccion"))&&!finite(r.get("objetivo")))err(p+".objetivo","comparación por objetivo requiere número finito");
            if(!"objetivo".equals(r.get("direccion"))&&r.get("objetivo")!=null)err(p+".objetivo","objetivo solo se usa con dirección objetivo");
            Map<String,Object> tolerance=obj(r.get("tolerancia"));
            if(r.get("tolerancia")!=null&&(tolerance==null||!finite(tolerance.get("valor"))||number(tolerance.get("valor")).doubleValue()<0||!java.util.Objects.equals(tolerance.get("unidad"),r.get("unidad"))))err(p+".tolerancia","tolerancia debe ser finita, no negativa y usar la unidad de la regla");
            Map<String,Object> norm=obj(normalization), val=norm==null?null:obj(norm.get("valor"));
            if(norm==null||!"normalizada".equals(norm.get("estado")))err(p,"solo se comparan valores normalizados");
            else if(val==null||!"magnitud".equals(val.get("tipo"))||!java.util.Objects.equals(val.get("unidad"),r.get("unidad")))err(p,"orden_numerico solo admite magnitud escalar en la unidad de la regla");
        } else if("igualdad_estructural".equals(r.get("modo"))) {
            if(!r.containsKey("unidad")||!r.containsKey("objetivo")||!r.containsKey("tolerancia"))err(p,"unidad, objetivo y tolerancia deben declararse explícitamente como null");
            if(r.get("unidad")!=null||!"igualdad".equals(r.get("direccion"))||r.get("objetivo")!=null||r.get("tolerancia")!=null)err(p,"igualdad estructural no admite unidad, dirección de ranking ni tolerancia");
            if(n==null||!"normalizada".equals(n.get("estado")))err(p,"igualdad estructural requiere valor normalizado");
        } else err(p+".modo","modo de comparación no soportado");
    }

    private void validateValue(Object raw,String p,int depth) {
        Map<String,Object> v=obj(raw); if(v==null||!text(v.get("tipo"))){err(p,"debe ser un valor tipado");return;}
        String type=(String)v.get("tipo");
        switch(type) {
            case "texto" -> {if(!text(v.get("valor")))err(p,"el texto no puede estar vacío");}
            case "numero" -> {if(!finite(v.get("valor")))err(p,"debe ser un número finito");}
            case "booleano" -> {if(!(v.get("valor") instanceof Boolean))err(p,"debe ser booleano");}
            case "magnitud" -> {if(!finite(v.get("valor")))err(p,"la magnitud debe ser finita");if(!member(UNIDADES,v.get("unidad")))err(p,"unidad canónica desconocida");}
            case "lista" -> {
                List<?> items=list(v.get("elementos")); if(items==null||items.isEmpty()){err(p,"la lista debe tener elementos");return;}
                String semantic=string(v.get("semantica")), itemType=string(v.get("tipo_elemento"));
                if(!member(Set.of("secuencia","conjunto"),semantic))err(p,"semántica de lista inválida");
                if(!member(Set.of("texto","numero","booleano","magnitud"),itemType))err(p,"tipo_elemento inválido");
                List<Object> signatures=new ArrayList<>(); Object unit=null;
                for(int i=0;i<items.size();i++){Map<String,Object> item=obj(items.get(i));if(item==null||!java.util.Objects.equals(item.get("tipo"),itemType)){err(p+".elementos["+i+"]","el elemento no coincide con tipo_elemento");continue;}validateValue(item,p+".elementos["+i+"]",depth+1);if("magnitud".equals(itemType)){if(unit==null)unit=item.get("unidad");else if(!unit.equals(item.get("unidad")))err(p,"todas las magnitudes de la lista deben usar la misma unidad");}if("conjunto".equals(semantic)&&signatures.stream().anyMatch(prior->jsonEqual(prior,item)))err(p,"un conjunto no puede contener elementos duplicados"); signatures.add(item);}
            }
            case "dimensiones" -> {
                List<?> axes=list(v.get("ejes"));if(axes==null||axes.size()<2){err(p,"se requieren al menos dos ejes");return;}Set<String> seen=new HashSet<>();Object unit=null;
                for(int i=0;i<axes.size();i++){Map<String,Object>a=obj(axes.get(i));String ap=p+".ejes["+i+"]";if(a==null||!member(Set.of("alto","ancho","profundidad","grosor","otro"),a.get("eje"))){err(ap,"eje inválido");continue;}String axis=string(a.get("eje")), name=axis.equals("otro")?"otro:"+String.valueOf(a.get("nombre_eje")):"estandar:"+axis;if(axis.equals("otro")&&!text(a.get("nombre_eje")))err(ap+".nombre_eje","un eje otro requiere nombre");if(!seen.add(name))err(ap,"eje duplicado");Map<String,Object> m=obj(a.get("magnitud"));if(m==null||!finite(m.get("valor"))||number(m.get("valor")).doubleValue()<=0||!member(UNIDADES_LONGITUD,m.get("unidad")))err(ap+".magnitud","una dimensión física requiere valor positivo finito y unidad de longitud canónica");else if(unit!=null&&!unit.equals(m.get("unidad")))err(ap+".magnitud.unidad","los ejes deben usar la misma unidad canónica");else unit=m.get("unidad");}
            }
            case "resolucion" -> {if(!positiveInteger(v.get("ancho"))||!positiveInteger(v.get("alto")))err(p,"ancho y alto deben ser enteros positivos");if(!"px".equals(v.get("unidad")))err(p+".unidad","la resolución debe usar px");}
            case "rango" -> {Map<String,Object> min=obj(v.get("minimo")),max=obj(v.get("maximo"));if(min==null||max==null||!finite(min.get("valor"))||!finite(max.get("valor"))||!member(UNIDADES,min.get("unidad"))||!member(UNIDADES,max.get("unidad"))){err(p,"los extremos requieren magnitudes finitas y unidades canónicas");return;}if(!java.util.Objects.equals(min.get("unidad"),max.get("unidad")))err(p,"los extremos deben usar la misma unidad canónica");if(number(min.get("valor")).doubleValue()>number(max.get("valor")).doubleValue())err(p,"el mínimo no puede superar al máximo");}
            case "compuesto" -> {if(depth>3){err(p,"supera la profundidad máxima de tres niveles de compuesto");return;}List<?> components=list(v.get("componentes"));if(components==null||components.isEmpty()){err(p,"el compuesto debe tener componentes");return;}Set<String> keys=new HashSet<>();for(int i=0;i<components.size();i++){Map<String,Object> c=obj(components.get(i));String cp=p+".componentes["+i+"]";if(c==null||!text(c.get("clave"))||!text(c.get("nombre"))){err(cp,"clave y nombre son obligatorios");continue;}if(!keys.add((String)c.get("clave")))err(cp,"clave de componente duplicada");validateValue(c.get("valor"),cp+".valor",depth+1);}}
            default -> err(p+".tipo","tipo de valor no soportado");
        }
    }

    private Set<String> ids(List<?> rows,String path){Set<String>s=new HashSet<>();for(int i=0;i<rows.size();i++){Map<String,Object>r=obj(rows.get(i));if(r==null||!text(r.get("id")))err(path+"["+i+"].id","id obligatorio");else if(!s.add((String)r.get("id")))err(path+"["+i+"].id","id duplicado");}return s;}
    private Map<String,Map<String,Object>> objectsById(List<?> rows){Map<String,Map<String,Object>>m=new HashMap<>();for(Object x:rows){Map<String,Object>r=obj(x);if(r!=null&&text(r.get("id")))m.put((String)r.get("id"),r);}return m;}
    private List<?> array(Map<String,Object> m,String key){List<?>v=list(m.get(key));if(v==null)err(key,"debe ser un arreglo");return v;}
    @SuppressWarnings("unchecked") private static Map<String,Object> obj(Object x){return x instanceof Map<?,?> ? (Map<String,Object>)x : null;}
    private static List<?> list(Object x){return x instanceof List<?> l?l:null;}
    private static boolean text(Object x){return x instanceof String s&&!s.trim().isEmpty();}
    private static boolean nullableText(Object x){return x==null||x instanceof String;}
    private static boolean hasNullableText(Map<String,Object> row,String... fields){for(String f:fields)if(!row.containsKey(f)||!nullableText(row.get(f)))return false;return true;}
    private static String string(Object x){return x instanceof String s?s:null;}
    private static boolean member(Set<String> set,Object value){return value instanceof String s&&set.contains(s);}
    private static boolean finite(Object x){return x instanceof Number n&&Double.isFinite(n.doubleValue());}
    private static Number number(Object x){return x instanceof Number n?n:0;}
    private static boolean integer(Object x){return x instanceof Number n&&n.doubleValue()==Math.rint(n.doubleValue());}
    private static boolean positiveInteger(Object x){return integer(x)&&number(x).doubleValue()>0;}
    /** Equality follows JSON structural semantics: object key order is ignored, array order retained,
     * and all JSON numbers use JavaScript Number/IEEE-754 equality (including 1 == 1.0 and -0 == 0).
     */
    private static boolean jsonEqual(Object a,Object b){
        if(a instanceof Number x && b instanceof Number y) return Double.isFinite(x.doubleValue()) && Double.isFinite(y.doubleValue()) && x.doubleValue()==y.doubleValue();
        if(a==null || b==null) return a==b;
        if(a instanceof Map<?,?> x && b instanceof Map<?,?> y){
            if(x.size()!=y.size()) return false;
            for(Map.Entry<?,?> e:x.entrySet()) if(!y.containsKey(e.getKey()) || !jsonEqual(e.getValue(),y.get(e.getKey()))) return false;
            return true;
        }
        if(a instanceof List<?> x && b instanceof List<?> y){
            if(x.size()!=y.size()) return false;
            for(int i=0;i<x.size();i++) if(!jsonEqual(x.get(i),y.get(i))) return false;
            return true;
        }
        return a.getClass()==b.getClass() && a.equals(b);
    }
    private void err(String path,String message){errors.add(path+": "+message);}
}
