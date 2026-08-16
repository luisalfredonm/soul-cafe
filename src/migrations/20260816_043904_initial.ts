import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_productos_etiquetas" AS ENUM('vegan', 'gf', 'nocoffee');
  CREATE TYPE "public"."enum_usuarios_rol" AS ENUM('admin', 'cajero');
  CREATE TYPE "public"."enum_pedidos_pagos_medio" AS ENUM('efectivo', 'tarjeta', 'sinpe', 'linea');
  CREATE TYPE "public"."enum_pedidos_canal" AS ENUM('web', 'mostrador');
  CREATE TYPE "public"."enum_pedidos_estado" AS ENUM('nuevo', 'preparando', 'listo', 'entregado', 'cancelado', 'anulado');
  CREATE TYPE "public"."enum_pedidos_pago_estado" AS ENUM('pendiente', 'pagado', 'fallido', 'reembolsado');
  CREATE TYPE "public"."enum_cajas_estado" AS ENUM('abierta', 'cerrada');
  CREATE TYPE "public"."enum_movimientos_tipo" AS ENUM('ingreso', 'retiro', 'gasto');
  CREATE TABLE "productos_etiquetas" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_productos_etiquetas",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "productos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"precio" numeric NOT NULL,
  	"categoria_id" integer NOT NULL,
  	"costo" numeric,
  	"foto_id" integer,
  	"agotado" boolean DEFAULT false,
  	"destacado" boolean DEFAULT false,
  	"orden" numeric DEFAULT 0,
  	"cabys" varchar,
  	"tarifa_iva" numeric,
  	"disponible_delivery" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "productos_locales" (
  	"nombre" varchar NOT NULL,
  	"descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categorias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"orden" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categorias_locales" (
  	"nombre" varchar NOT NULL,
  	"nota" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paginas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paginas_locales" (
  	"contenido" jsonb,
  	"meta_titulo" varchar,
  	"meta_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_retrato_url" varchar,
  	"sizes_retrato_width" numeric,
  	"sizes_retrato_height" numeric,
  	"sizes_retrato_mime_type" varchar,
  	"sizes_retrato_filesize" numeric,
  	"sizes_retrato_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "usuarios_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "usuarios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar,
  	"rol" "enum_usuarios_rol" DEFAULT 'cajero' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "pedidos_lineas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"producto_id" integer,
  	"nombre" varchar NOT NULL,
  	"cantidad" numeric DEFAULT 1 NOT NULL,
  	"precio_unitario" numeric NOT NULL,
  	"tarifa_iva" numeric NOT NULL,
  	"cabys" varchar,
  	"costo_unitario" numeric,
  	"subtotal" numeric,
  	"monto_iva" numeric,
  	"total" numeric
  );
  
  CREATE TABLE "pedidos_pagos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"medio" "enum_pedidos_pagos_medio" DEFAULT 'efectivo' NOT NULL,
  	"monto" numeric NOT NULL,
  	"referencia" varchar
  );
  
  CREATE TABLE "pedidos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero" numeric,
  	"codigo" varchar,
  	"canal" "enum_pedidos_canal" DEFAULT 'web' NOT NULL,
  	"mesa" numeric,
  	"estado" "enum_pedidos_estado" DEFAULT 'nuevo' NOT NULL,
  	"hora_retiro" timestamp(3) with time zone,
  	"caja_id" integer,
  	"atendido_por_id" integer,
  	"bloqueado" boolean DEFAULT false,
  	"cliente_nombre" varchar NOT NULL,
  	"cliente_telefono" varchar,
  	"cliente_email" varchar,
  	"notas" varchar,
  	"descuento_porcentaje" numeric DEFAULT 0,
  	"descuento_motivo" varchar,
  	"descuento_monto" numeric,
  	"subtotal" numeric,
  	"total_iva" numeric,
  	"total" numeric,
  	"pago_estado" "enum_pedidos_pago_estado" DEFAULT 'pendiente' NOT NULL,
  	"pago_fecha" timestamp(3) with time zone,
  	"efectivo_recibido" numeric,
  	"vuelto" numeric,
  	"total_pagado" numeric,
  	"pago_proveedor" varchar,
  	"pago_referencia" varchar,
  	"anulacion_motivo" varchar,
  	"anulado_por_id" integer,
  	"anulado_fecha" timestamp(3) with time zone,
  	"requiere_factura" boolean DEFAULT false,
  	"factura_nombre" varchar,
  	"factura_cedula" varchar,
  	"factura_emitida" boolean DEFAULT false,
  	"factura_consecutivo" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cajas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"estado" "enum_cajas_estado" DEFAULT 'abierta' NOT NULL,
  	"abierta_por_id" integer,
  	"cerrada_por_id" integer,
  	"apertura_fecha" timestamp(3) with time zone,
  	"cierre_fecha" timestamp(3) with time zone,
  	"fondo_inicial" numeric DEFAULT 0 NOT NULL,
  	"efectivo_contado" numeric,
  	"total_efectivo" numeric,
  	"total_tarjeta" numeric,
  	"total_sinpe" numeric,
  	"total_linea" numeric,
  	"cantidad_ventas" numeric,
  	"total_ventas" numeric,
  	"esperado_efectivo" numeric,
  	"total_ingresos" numeric,
  	"total_salidas" numeric,
  	"total_bruto" numeric,
  	"total_descuentos" numeric,
  	"total_iva" numeric,
  	"cantidad_anuladas" numeric,
  	"total_anulado" numeric,
  	"diferencia" numeric,
  	"notas" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "movimientos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"caja_id" integer NOT NULL,
  	"registrado_por_id" integer,
  	"fecha" timestamp(3) with time zone,
  	"tipo" "enum_movimientos_tipo" DEFAULT 'gasto' NOT NULL,
  	"monto" numeric NOT NULL,
  	"motivo" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"productos_id" integer,
  	"categorias_id" integer,
  	"paginas_id" integer,
  	"media_id" integer,
  	"usuarios_id" integer,
  	"pedidos_id" integer,
  	"cajas_id" integer,
  	"movimientos_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"usuarios_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ajustes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hora_apertura" varchar DEFAULT '6:30',
  	"whatsapp" varchar DEFAULT '+506 0000 0000',
  	"maps_url" varchar DEFAULT 'https://maps.google.com/?q=Huacas+Guanacaste',
  	"instagram" varchar,
  	"pedidos_activos" boolean DEFAULT false,
  	"pedidos_desde" varchar DEFAULT '06:00',
  	"pedidos_hasta" varchar DEFAULT '17:00',
  	"pedidos_anticipacion_min" numeric DEFAULT 15,
  	"tarifa_iva_defecto" numeric DEFAULT 13 NOT NULL,
  	"cantidad_mesas" numeric DEFAULT 10 NOT NULL,
  	"negocio_nombre_legal" varchar DEFAULT 'Soul Cafe',
  	"cedula_juridica" varchar,
  	"tiquete_pie" varchar DEFAULT '¡Gracias por su visita!',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "ajustes_locales" (
  	"horario_semana" varchar DEFAULT 'Lun–Vie 6:30 – 18:00',
  	"horario_finde" varchar DEFAULT 'Sáb–Dom 6:30 – 16:00',
  	"direccion" varchar DEFAULT '200 m norte del semáforo de Huacas',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "destacados_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"producto_id" integer
  );
  
  CREATE TABLE "destacados_items_locales" (
  	"titulo" varchar,
  	"nota" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "destacados" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"activo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "destacados_locales" (
  	"titulo" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "productos_etiquetas" ADD CONSTRAINT "productos_etiquetas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "productos" ADD CONSTRAINT "productos_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "productos_locales" ADD CONSTRAINT "productos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categorias_locales" ADD CONSTRAINT "categorias_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_locales" ADD CONSTRAINT "paginas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usuarios_sessions" ADD CONSTRAINT "usuarios_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pedidos_lineas" ADD CONSTRAINT "pedidos_lineas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos_lineas" ADD CONSTRAINT "pedidos_lineas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pedidos_pagos" ADD CONSTRAINT "pedidos_pagos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_caja_id_cajas_id_fk" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_atendido_por_id_usuarios_id_fk" FOREIGN KEY ("atendido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_anulado_por_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cajas" ADD CONSTRAINT "cajas_abierta_por_id_usuarios_id_fk" FOREIGN KEY ("abierta_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cajas" ADD CONSTRAINT "cajas_cerrada_por_id_usuarios_id_fk" FOREIGN KEY ("cerrada_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_caja_id_cajas_id_fk" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_productos_fk" FOREIGN KEY ("productos_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usuarios_fk" FOREIGN KEY ("usuarios_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pedidos_fk" FOREIGN KEY ("pedidos_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cajas_fk" FOREIGN KEY ("cajas_id") REFERENCES "public"."cajas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_movimientos_fk" FOREIGN KEY ("movimientos_id") REFERENCES "public"."movimientos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_usuarios_fk" FOREIGN KEY ("usuarios_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ajustes_locales" ADD CONSTRAINT "ajustes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ajustes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "destacados_items" ADD CONSTRAINT "destacados_items_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "destacados_items" ADD CONSTRAINT "destacados_items_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "destacados_items" ADD CONSTRAINT "destacados_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."destacados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "destacados_items_locales" ADD CONSTRAINT "destacados_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."destacados_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "destacados_locales" ADD CONSTRAINT "destacados_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."destacados"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "productos_etiquetas_order_idx" ON "productos_etiquetas" USING btree ("order");
  CREATE INDEX "productos_etiquetas_parent_idx" ON "productos_etiquetas" USING btree ("parent_id");
  CREATE INDEX "productos_categoria_idx" ON "productos" USING btree ("categoria_id");
  CREATE INDEX "productos_foto_idx" ON "productos" USING btree ("foto_id");
  CREATE INDEX "productos_updated_at_idx" ON "productos" USING btree ("updated_at");
  CREATE INDEX "productos_created_at_idx" ON "productos" USING btree ("created_at");
  CREATE UNIQUE INDEX "productos_locales_locale_parent_id_unique" ON "productos_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categorias_slug_idx" ON "categorias" USING btree ("slug");
  CREATE INDEX "categorias_updated_at_idx" ON "categorias" USING btree ("updated_at");
  CREATE INDEX "categorias_created_at_idx" ON "categorias" USING btree ("created_at");
  CREATE UNIQUE INDEX "categorias_locales_locale_parent_id_unique" ON "categorias_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "paginas_slug_idx" ON "paginas" USING btree ("slug");
  CREATE INDEX "paginas_updated_at_idx" ON "paginas" USING btree ("updated_at");
  CREATE INDEX "paginas_created_at_idx" ON "paginas" USING btree ("created_at");
  CREATE UNIQUE INDEX "paginas_locales_locale_parent_id_unique" ON "paginas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_retrato_sizes_retrato_filename_idx" ON "media" USING btree ("sizes_retrato_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "usuarios_sessions_order_idx" ON "usuarios_sessions" USING btree ("_order");
  CREATE INDEX "usuarios_sessions_parent_id_idx" ON "usuarios_sessions" USING btree ("_parent_id");
  CREATE INDEX "usuarios_updated_at_idx" ON "usuarios" USING btree ("updated_at");
  CREATE INDEX "usuarios_created_at_idx" ON "usuarios" USING btree ("created_at");
  CREATE UNIQUE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");
  CREATE INDEX "pedidos_lineas_order_idx" ON "pedidos_lineas" USING btree ("_order");
  CREATE INDEX "pedidos_lineas_parent_id_idx" ON "pedidos_lineas" USING btree ("_parent_id");
  CREATE INDEX "pedidos_lineas_producto_idx" ON "pedidos_lineas" USING btree ("producto_id");
  CREATE INDEX "pedidos_pagos_order_idx" ON "pedidos_pagos" USING btree ("_order");
  CREATE INDEX "pedidos_pagos_parent_id_idx" ON "pedidos_pagos" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pedidos_numero_idx" ON "pedidos" USING btree ("numero");
  CREATE INDEX "pedidos_canal_idx" ON "pedidos" USING btree ("canal");
  CREATE INDEX "pedidos_mesa_idx" ON "pedidos" USING btree ("mesa");
  CREATE INDEX "pedidos_caja_idx" ON "pedidos" USING btree ("caja_id");
  CREATE INDEX "pedidos_atendido_por_idx" ON "pedidos" USING btree ("atendido_por_id");
  CREATE INDEX "pedidos_anulado_por_idx" ON "pedidos" USING btree ("anulado_por_id");
  CREATE INDEX "pedidos_updated_at_idx" ON "pedidos" USING btree ("updated_at");
  CREATE INDEX "pedidos_created_at_idx" ON "pedidos" USING btree ("created_at");
  CREATE INDEX "cajas_abierta_por_idx" ON "cajas" USING btree ("abierta_por_id");
  CREATE INDEX "cajas_cerrada_por_idx" ON "cajas" USING btree ("cerrada_por_id");
  CREATE INDEX "cajas_updated_at_idx" ON "cajas" USING btree ("updated_at");
  CREATE INDEX "cajas_created_at_idx" ON "cajas" USING btree ("created_at");
  CREATE INDEX "movimientos_caja_idx" ON "movimientos" USING btree ("caja_id");
  CREATE INDEX "movimientos_registrado_por_idx" ON "movimientos" USING btree ("registrado_por_id");
  CREATE INDEX "movimientos_updated_at_idx" ON "movimientos" USING btree ("updated_at");
  CREATE INDEX "movimientos_created_at_idx" ON "movimientos" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_productos_id_idx" ON "payload_locked_documents_rels" USING btree ("productos_id");
  CREATE INDEX "payload_locked_documents_rels_categorias_id_idx" ON "payload_locked_documents_rels" USING btree ("categorias_id");
  CREATE INDEX "payload_locked_documents_rels_paginas_id_idx" ON "payload_locked_documents_rels" USING btree ("paginas_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_usuarios_id_idx" ON "payload_locked_documents_rels" USING btree ("usuarios_id");
  CREATE INDEX "payload_locked_documents_rels_pedidos_id_idx" ON "payload_locked_documents_rels" USING btree ("pedidos_id");
  CREATE INDEX "payload_locked_documents_rels_cajas_id_idx" ON "payload_locked_documents_rels" USING btree ("cajas_id");
  CREATE INDEX "payload_locked_documents_rels_movimientos_id_idx" ON "payload_locked_documents_rels" USING btree ("movimientos_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_usuarios_id_idx" ON "payload_preferences_rels" USING btree ("usuarios_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE UNIQUE INDEX "ajustes_locales_locale_parent_id_unique" ON "ajustes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "destacados_items_order_idx" ON "destacados_items" USING btree ("_order");
  CREATE INDEX "destacados_items_parent_id_idx" ON "destacados_items" USING btree ("_parent_id");
  CREATE INDEX "destacados_items_imagen_idx" ON "destacados_items" USING btree ("imagen_id");
  CREATE INDEX "destacados_items_producto_idx" ON "destacados_items" USING btree ("producto_id");
  CREATE UNIQUE INDEX "destacados_items_locales_locale_parent_id_unique" ON "destacados_items_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "destacados_locales_locale_parent_id_unique" ON "destacados_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "productos_etiquetas" CASCADE;
  DROP TABLE "productos" CASCADE;
  DROP TABLE "productos_locales" CASCADE;
  DROP TABLE "categorias" CASCADE;
  DROP TABLE "categorias_locales" CASCADE;
  DROP TABLE "paginas" CASCADE;
  DROP TABLE "paginas_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "usuarios_sessions" CASCADE;
  DROP TABLE "usuarios" CASCADE;
  DROP TABLE "pedidos_lineas" CASCADE;
  DROP TABLE "pedidos_pagos" CASCADE;
  DROP TABLE "pedidos" CASCADE;
  DROP TABLE "cajas" CASCADE;
  DROP TABLE "movimientos" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "ajustes" CASCADE;
  DROP TABLE "ajustes_locales" CASCADE;
  DROP TABLE "destacados_items" CASCADE;
  DROP TABLE "destacados_items_locales" CASCADE;
  DROP TABLE "destacados" CASCADE;
  DROP TABLE "destacados_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_productos_etiquetas";
  DROP TYPE "public"."enum_usuarios_rol";
  DROP TYPE "public"."enum_pedidos_pagos_medio";
  DROP TYPE "public"."enum_pedidos_canal";
  DROP TYPE "public"."enum_pedidos_estado";
  DROP TYPE "public"."enum_pedidos_pago_estado";
  DROP TYPE "public"."enum_cajas_estado";
  DROP TYPE "public"."enum_movimientos_tipo";`)
}
