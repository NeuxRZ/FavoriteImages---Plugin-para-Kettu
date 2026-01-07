// FavoriteImages Plugin para Kettu
// Permite guardar imágenes JPG/PNG en los favoritos de GIFs

import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";

// Inicializar almacenamiento
storage.favoriteImages ??= [];

const patches = [];

// Función para agregar imagen a favoritos
function addToFavorites(url: string, format: string) {
  const exists = storage.favoriteImages.some((img: any) => img.url === url);
  
  if (!exists) {
    storage.favoriteImages.push({
      url,
      format,
      id: `img_${Date.now()}`,
      timestamp: Date.now()
    });
    showToast("✅ Imagen agregada a favoritos");
  } else {
    showToast("⚠️ Esta imagen ya está en favoritos");
  }
}

// Función para remover de favoritos
function removeFromFavorites(url: string) {
  const index = storage.favoriteImages.findIndex((img: any) => img.url === url);
  
  if (index !== -1) {
    storage.favoriteImages.splice(index, 1);
    showToast("🗑️ Imagen removida de favoritos");
  }
}

// Función para verificar si es imagen válida
function isValidImage(attachment: any): boolean {
  if (!attachment?.content_type) return false;
  
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  return validTypes.includes(attachment.content_type.toLowerCase());
}

export default {
  onLoad: () => {
    try {
      // Intentar patchear el menú contextual de imágenes
      const ContextMenu = findByProps("openContextMenu");
      
      if (ContextMenu) {
        patches.push(
          after("openContextMenu", ContextMenu, ([component, props], res) => {
            // Verificar si hay attachments de imagen
            if (props?.message?.attachments) {
              const imageAttachment = props.message.attachments.find(isValidImage);
              
              if (imageAttachment) {
                const isFavorite = storage.favoriteImages.some(
                  (img: any) => img.url === imageAttachment.url
                );

                // Agregar botón al menú contextual
                res?.props?.children?.push({
                  label: isFavorite ? "Quitar de Favoritos" : "Agregar a Favoritos",
                  icon: isFavorite ? "ic_trash_24px" : "ic_star_24px",
                  onPress: () => {
                    if (isFavorite) {
                      removeFromFavorites(imageAttachment.url);
                    } else {
                      addToFavorites(imageAttachment.url, imageAttachment.content_type);
                    }
                  }
                });
              }
            }
            
            return res;
          })
        );
      }

      // Intentar agregar las imágenes al selector de GIFs
      const GifPickerStore = findByStoreName("GIFFavoritesStore");
      
      if (GifPickerStore) {
        // Extender los favoritos de GIF con nuestras imágenes
        patches.push(
          after("getFavorites", GifPickerStore, (args, res) => {
            // Convertir nuestras imágenes al formato de GIF favorito
            const customImages = storage.favoriteImages.map((img: any) => ({
              url: img.url,
              src: img.url,
              format: img.format || "1",
              id: img.id,
              type: "image"
            }));
            
            return [...(res || []), ...customImages];
          })
        );
      }

      showToast("🖼️ FavoriteImages cargado");
    } catch (error) {
      console.error("[FavoriteImages] Error en onLoad:", error);
      showToast("❌ Error al cargar FavoriteImages");
    }
  },

  onUnload: () => {
    // Limpiar todos los patches
    patches.forEach(p => p());
    patches.length = 0;
    showToast("FavoriteImages descargado");
  },

  settings: {
    FavoriteImages: {
      type: "custom",
      component: () => {
        const { View, Text, Image, ScrollView, TouchableOpacity } = React;
        
        return React.createElement(ScrollView, { style: { padding: 10 } },
          React.createElement(Text, { 
            style: { color: "#fff", fontSize: 18, marginBottom: 10 } 
          }, `Imágenes Favoritas (${storage.favoriteImages.length})`),
          
          React.createElement(View, { 
            style: { flexDirection: "row", flexWrap: "wrap" } 
          },
            storage.favoriteImages.map((img: any) => 
              React.createElement(TouchableOpacity, {
                key: img.id,
                onLongPress: () => removeFromFavorites(img.url),
                style: { margin: 5 }
              },
                React.createElement(Image, {
                  source: { uri: img.url },
                  style: { width: 100, height: 100, borderRadius: 8 }
                })
              )
            )
          ),
          
          React.createElement(Text, { 
            style: { color: "#aaa", fontSize: 12, marginTop: 20 } 
          }, "Mantén presionada una imagen para eliminarla")
        );
      }
    }
  }
};
