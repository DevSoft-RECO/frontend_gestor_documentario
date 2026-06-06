<template>
  <div class="p-6 md:p-8 space-y-8 font-['Plus_Jakarta_Sans']">
    <!-- HEADER -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Dashboard Analítico
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Resumen ejecutivo del Gestor Documental — <span class="font-bold text-sky-600 dark:text-sky-400">{{ fechaActual }}</span>
        </p>
      </div>
      <button @click="fetchStats" :disabled="loading"
              class="self-start md:self-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50 flex items-center gap-2">
        <svg v-if="loading" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        <span>Actualizar</span>
      </button>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading && !stats" class="flex flex-col items-center justify-center py-32 gap-4">
      <div class="w-14 h-14 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
      <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Cargando analíticas...</p>
    </div>

    <template v-if="stats">
      <!-- KPI CARDS -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div v-for="(kpi, i) in kpis" :key="i"
             class="group relative overflow-hidden rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-xl cursor-default"
             :class="kpi.border">
          <div class="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" :class="kpi.glow"></div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-inner" :class="kpi.iconBg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="kpi.icon" :class="kpi.iconColor"></svg>
          </div>
          <p class="text-2xl font-black tracking-tight" :class="kpi.valueColor">{{ kpi.value.toLocaleString() }}</p>
          <p class="text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{{ kpi.label }}</p>
        </div>
      </div>

      <!-- CHARTS ROW -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- BAR CHART: Documentos por Mes -->
        <div class="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Documentos por Mes</h3>
              <p class="text-[0.65rem] text-slate-400 mt-0.5">Últimos 6 meses de actividad</p>
            </div>
            <span class="text-[0.6rem] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">TENDENCIA</span>
          </div>
          <div class="h-[260px]">
            <canvas ref="barChartCanvas"></canvas>
          </div>
        </div>

        <!-- DONUT CHART: Distribución por Categoría -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div class="mb-6">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Por Categoría</h3>
            <p class="text-[0.65rem] text-slate-400 mt-0.5">Distribución de documentos</p>
          </div>
          <div class="h-[220px] flex items-center justify-center">
            <canvas ref="donutChartCanvas"></canvas>
          </div>
          <div class="mt-4 space-y-2">
            <div v-for="(cat, i) in stats.documentos_por_categoria" :key="i" class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" :style="{ background: donutColors[i % donutColors.length] }"></span>
                <span class="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{{ cat.nombre }}</span>
              </div>
              <span class="font-black text-slate-900 dark:text-white">{{ cat.total }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM ROW -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- ACTIVIDAD RECIENTE -->
        <div class="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-violet-600 dark:text-violet-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Actividad Reciente</h3>
            </div>
            <span class="text-[0.6rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full">ÚLTIMAS 10</span>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="(item, i) in stats.actividad_reciente" :key="i"
                 class="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div class="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 text-xs font-black shrink-0">
                {{ item.usuario_nombre?.charAt(0) || '?' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ item.etiqueta }}</p>
                <p class="text-[0.6rem] text-slate-400 mt-0.5">
                  <span class="font-bold">{{ item.usuario_nombre }}</span> · {{ item.tipo_movimiento }} · {{ item.asociado_nombre }}
                </p>
              </div>
              <span class="text-[0.6rem] font-mono text-slate-400 shrink-0">{{ formatDate(item.fecha_operacion) }}</span>
            </div>
            <div v-if="!stats.actividad_reciente?.length" class="py-16 text-center text-slate-400">
              <p class="text-xs font-bold">Sin actividad registrada</p>
            </div>
          </div>
        </div>

        <!-- ALERTAS DE VENCIMIENTO -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 dark:text-amber-400"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Por Vencer</h3>
            </div>
            <span v-if="stats.docs_por_vencer > 0" class="text-[0.6rem] font-black bg-amber-500 text-white px-2.5 py-1 rounded-full animate-pulse">
              {{ stats.docs_por_vencer }}
            </span>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800 max-h-[320px] overflow-y-auto custom-scrollbar">
            <div v-for="(alerta, i) in stats.alertas_vencimiento" :key="i"
                 class="px-5 py-3.5 hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ alerta.etiqueta }}</p>
                  <p class="text-[0.6rem] text-slate-400 mt-0.5">{{ alerta.asociado_nombre }} · {{ alerta.subcategoria }}</p>
                </div>
                <span class="text-[0.6rem] font-black px-2 py-0.5 rounded-md shrink-0"
                      :class="getDaysUntil(alerta.fecha_vencimiento) <= 7
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'">
                  {{ getDaysUntil(alerta.fecha_vencimiento) }} días
                </span>
              </div>
              <p v-if="alerta.numero_documento" class="text-[0.6rem] font-mono text-slate-400 mt-1">#{{ alerta.numero_documento }}</p>
            </div>
            <div v-if="!stats.alertas_vencimiento?.length" class="py-16 text-center">
              <div class="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-500"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Todo al día</p>
              <p class="text-[0.6rem] text-slate-400 mt-1">No hay documentos próximos a vencer</p>
            </div>
          </div>
        </div>
      </div>

      <!-- SEPARATOR FOR MANUALS SECTION -->
      <div class="pt-6 border-t border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-violet-600 dark:text-violet-400">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Biblioteca de Normativas & Documentación
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Analíticas de volumen y distribución de Normativas en la plataforma
            </p>
          </div>
        </div>
      </div>

      <!-- MANUALS KPI CARDS -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="(kpi, i) in manualKpis" :key="i"
             class="group relative overflow-hidden rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-xl cursor-default"
             :class="kpi.border">
          <div class="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" :class="kpi.glow"></div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-inner" :class="kpi.iconBg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="kpi.icon" :class="kpi.iconColor"></svg>
          </div>
          <p class="text-2xl font-black tracking-tight" :class="kpi.valueColor">{{ kpi.value.toLocaleString() }}</p>
          <p class="text-[0.65rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{{ kpi.label }}</p>
        </div>
      </div>

      <!-- MANUALS BOTTOM SECTION: Category Distribution & Recent Manuals -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- Manuals Category Distribution List / Bar Breakdown (Left 2 cols) -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div class="mb-6">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Normativas por Categoría</h3>
            <p class="text-[0.65rem] text-slate-400 mt-0.5">Distribución de biblioteca de normativas</p>
          </div>
          <div class="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            <div v-for="(cat, i) in stats.manuales_por_categoria" :key="i" class="space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span class="truncate max-w-[170px]">{{ cat.nombre }}</span>
                <span class="font-black text-slate-900 dark:text-white">{{ cat.total }}</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                     :style="{
                       width: `${(cat.total / (stats.total_manuales || 1)) * 100}%`,
                       backgroundColor: donutColors[i % donutColors.length]
                     }">
                </div>
              </div>
            </div>
            <div v-if="!stats.manuales_por_categoria?.length" class="py-16 text-center text-slate-400">
              <p class="text-xs font-bold">Sin categorías registradas</p>
            </div>
          </div>
        </div>

        <!-- Recent Manuals Uploads List (Right 3 cols) -->
        <div class="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-600 dark:text-emerald-400">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <h3 class="text-sm font-extrabold text-slate-800 dark:text-slate-100">Normativas Recientes</h3>
            </div>
            <span class="text-[0.6rem] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full">ÚLTIMOS 5</span>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="(item, i) in stats.manuales_recientes" :key="i"
                 class="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div class="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs font-black shrink-0">
                M
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ item.titulo }}</p>
                <p class="text-[0.6rem] text-slate-400 mt-0.5">
                  Subido por <span class="font-bold text-slate-600 dark:text-slate-300">{{ item.usuario_nombre }}</span> · Subcategoría: <span class="font-semibold text-sky-600 dark:text-sky-400">{{ item.subcategoria }}</span>
                </p>
              </div>
              <span class="text-[0.6rem] font-mono text-slate-400 shrink-0">{{ formatDate(item.fecha_creacion) }}</span>
            </div>
            <div v-if="!stats.manuales_recientes?.length" class="py-16 text-center text-slate-400">
              <p class="text-xs font-bold">Sin normativas cargados</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController } from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Stats {
  total_asociados: number
  total_documentos: number
  total_indices: number
  docs_por_vencer: number
  categorias_activas: number
  operaciones_mes: number
  documentos_por_mes: { mes: string; total: number }[]
  documentos_por_categoria: { nombre: string; total: number }[]
  actividad_reciente: { etiqueta: string; tipo_movimiento: string; fecha_operacion: string; usuario_nombre: string; asociado_nombre: string }[]
  alertas_vencimiento: { etiqueta: string; numero_documento: string | null; fecha_vencimiento: string; asociado_nombre: string; subcategoria: string }[]
  // Nuevos campos
  total_manuales: number
  total_categorias_manuales: number
  total_paginas_manuales: number
  manuales_creados_mes: number
  manuales_por_categoria: { nombre: string; total: number }[]
  manuales_recientes: { titulo: string; fecha_creacion: string; usuario_nombre: string; subcategoria: string }[]
}

const stats = ref<Stats | null>(null)
const loading = ref(false)
const barChartCanvas = ref<HTMLCanvasElement | null>(null)
const donutChartCanvas = ref<HTMLCanvasElement | null>(null)

let barChart: Chart | null = null
let donutChart: Chart | null = null

const donutColors = [
  '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
]

const fechaActual = computed(() => {
  return new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const kpis = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'Asociados',
      value: stats.value.total_asociados,
      icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
      iconBg: 'bg-sky-50 dark:bg-sky-900/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      valueColor: 'text-sky-700 dark:text-sky-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-sky-500'
    },
    {
      label: 'Documentos',
      value: stats.value.total_documentos,
      icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-emerald-500'
    },
    {
      label: 'Índices',
      value: stats.value.total_indices,
      icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
      iconBg: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-700 dark:text-violet-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-violet-500'
    },
    {
      label: 'Por Vencer',
      value: stats.value.docs_por_vencer,
      icon: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-amber-500'
    },
    {
      label: 'Categorías',
      value: stats.value.categorias_activas,
      icon: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
      iconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      valueColor: 'text-cyan-700 dark:text-cyan-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-cyan-500'
    },
    {
      label: 'Operaciones del Mes',
      value: stats.value.operaciones_mes,
      icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-700 dark:text-rose-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-rose-500'
    }
  ]
})

const manualKpis = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'Normativas Totales',
      value: stats.value.total_manuales || 0,
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
      iconBg: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-700 dark:text-violet-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-violet-500'
    },
    {
      label: 'Total de Páginas',
      value: stats.value.total_paginas_manuales || 0,
      icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-emerald-500'
    },
    {
      label: 'Categorías Normativas',
      value: stats.value.total_categorias_manuales || 0,
      icon: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
      iconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      valueColor: 'text-cyan-700 dark:text-cyan-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-cyan-500'
    },
    {
      label: 'Cargas del Mes',
      value: stats.value.manuales_creados_mes || 0,
      icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-700 dark:text-rose-300',
      border: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      glow: 'bg-rose-500'
    }
  ]
})

const fetchStats = async () => {
  loading.value = true
  try {
    const token = sessionStorage.getItem('access_token')
    const res = await fetch(`${API_URL}/api/gestor/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      stats.value = await res.json()
      await nextTick()
      renderCharts()
    }
  } catch (e) {
    console.error('Error fetching dashboard stats:', e)
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  renderBarChart()
  renderDonutChart()
}

const renderBarChart = () => {
  if (!barChartCanvas.value || !stats.value) return
  if (barChart) barChart.destroy()

  const isDark = document.documentElement.classList.contains('dark')
  const data = stats.value.documentos_por_mes || []

  barChart = new Chart(barChartCanvas.value, {
    type: 'bar',
    data: {
      labels: data.map(d => {
        const [y, m] = d.mes.split('-')
        return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('es', { month: 'short' })
      }),
      datasets: [{
        label: 'Documentos',
        data: data.map(d => d.total),
        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.6)' : 'rgba(14, 165, 233, 0.8)',
        borderColor: '#0ea5e9',
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#0f172a',
          titleFont: { weight: 'bold', size: 11 },
          bodyFont: { size: 11 },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11, weight: 'bold' as const } }
        },
        y: {
          beginAtZero: true,
          grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          ticks: {
            color: isDark ? '#64748b' : '#94a3b8',
            font: { size: 11 },
            stepSize: 1
          }
        }
      }
    }
  })
}

const renderDonutChart = () => {
  if (!donutChartCanvas.value || !stats.value) return
  if (donutChart) donutChart.destroy()

  const isDark = document.documentElement.classList.contains('dark')
  const data = stats.value.documentos_por_categoria || []

  donutChart = new Chart(donutChartCanvas.value, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.nombre),
      datasets: [{
        data: data.map(d => d.total),
        backgroundColor: donutColors.slice(0, data.length),
        borderColor: isDark ? '#0f172a' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#0f172a',
          titleFont: { weight: 'bold', size: 11 },
          bodyFont: { size: 11 },
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  })
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })
}

const getDaysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 20px; }
</style>
