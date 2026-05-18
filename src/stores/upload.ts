import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosInstance from '../api/axios'

export interface UploadItem {
  id: string
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'failed'
  error?: string
  asociadoId: string
  subcategoriaId: string
}

export const useUploadStore = defineStore('upload', () => {
  const uploads = ref<UploadItem[]>([])
  
  // Lista de callbacks para notificar cuando una carga finaliza con éxito
  const listeners = ref<Array<(asociadoId: string) => void>>([])

  function onUploadCompleted(callback: (asociadoId: string) => void) {
    listeners.value.push(callback)
  }

  function triggerCompleted(asociadoId: string) {
    listeners.value.forEach(cb => {
      try {
        cb(asociadoId)
      } catch (e) {
        console.error('Error en listener de upload:', e)
      }
    })
  }

  async function uploadFile(payload: {
    file: File
    asociadoId: string
    subcategoriaId: string
    etiqueta?: string
    numeroDocumento?: string
    fechaVencimiento?: string
  }) {
    const uploadId = Math.random().toString(36).substring(2, 9)
    const newItem: UploadItem = {
      id: uploadId,
      fileName: payload.file.name,
      progress: 0,
      status: 'uploading',
      asociadoId: payload.asociadoId,
      subcategoriaId: payload.subcategoriaId
    }

    uploads.value.unshift(newItem)

    const formData = new FormData()
    formData.append('asociado_id', payload.asociadoId)
    formData.append('subcategoria_id', payload.subcategoriaId)
    if (payload.etiqueta) {
      formData.append('etiqueta', payload.etiqueta)
    }
    if (payload.numeroDocumento) {
      formData.append('numero_documento', payload.numeroDocumento)
    }
    if (payload.fechaVencimiento) {
      formData.append('fecha_vencimiento', payload.fechaVencimiento)
    }
    formData.append('documento', payload.file)

    try {
      await axiosInstance.post('/gestor/documentos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            const item = uploads.value.find(u => u.id === uploadId)
            if (item) {
              item.progress = percent
            }
          }
        }
      })

      const item = uploads.value.find(u => u.id === uploadId)
      if (item) {
        item.status = 'completed'
        item.progress = 100
      }

      // Disparar listeners para recargar vistas activas del expediente
      triggerCompleted(payload.asociadoId)

    } catch (err: any) {
      console.error('Error subiendo archivo:', err)
      const item = uploads.value.find(u => u.id === uploadId)
      if (item) {
        item.status = 'failed'
        item.error = err.response?.data?.error || 'Error al subir el archivo'
      }
    }
  }

  function clearCompleted() {
    uploads.value = uploads.value.filter(u => u.status === 'uploading')
  }

  function removeUpload(id: string) {
    uploads.value = uploads.value.filter(u => u.id !== id)
  }

  return {
    uploads,
    uploadFile,
    clearCompleted,
    removeUpload,
    onUploadCompleted
  }
})
