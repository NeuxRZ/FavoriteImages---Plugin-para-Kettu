/**
 * FavoriteImages - Plugin para Kettu
 * Permite guardar imágenes (JPG/PNG/GIF) en favoritos
 * Versión: 1.0.0
 */

import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";

// Inicializar almacenamiento
storage.images = storage.images || [];

const patches = [];

// Verificar si es imagen válida
function isValidImage(attachment) {
  if (!attachment?.content_type) return false;
  const type = attachment.content_type.toLowerCase();
  return type.includes("image/jpeg") || 
         type.includes("image/jpg") || 
         type.includes("image/png") || 
         type.includes("image/gif");
}

// Agregar imagen a favoritos
function addImage(url, filename) {
  const exists = storage.images.some(img => img.url === url);
  
  if (exists) {
    showToast("⚠️ Esta imagen ya está guardada", getAssetIDByName("ic_warning_24px"));
    return;
  }
  
  storage.images.push({
    url: url,
    filename: filename || "imagen",
    id: "img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  });
  
  showToast("⭐ Imagen guardada", getAssetIDByName("ic_star_24px"));
}

// Remover imagen de favoritos
function removeImage(url) {
  const before = storage.images.length;
  storage.images = storage.images.filter(img => img.url !== url);
  
  if (storage.images.length < before) {
    showToast("🗑️ Imagen eliminada", getAssetIDByName("ic_trash_24px"));
  }
}

// Verificar si está en favoritos
function isFavorited(url) {
  return storage.images.some(img => img.url === url);
}

export default {
  onLoad: () => {
    try {
      console.log("[FavoriteImages] Cargando plugin...");

      // Buscar módulo del menú contextual
      const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
      
      if (!LazyActionSheet) {
        console.error("[FavoriteImages] No se encontró LazyActionSheet");
        showToast("❌ Error al cargar el menú");
        return;
      }

      // Patch para agregar botón al menú
      const unpatch = after("openLazy", LazyActionSheet, (args, result) => {
        const [component, key, messageData] = args;

        // Solo para el menú de mensajes largos
        if (key !== "MessageLongPressActionSheet") return result;
        if (!messageData?.message) return result;

        const message = messageData.message;
        if (!message.attachments?.length) return result;

        // Buscar imagen en attachments
        const imageAttachment = message.attachments.find(isValidImage);
        if (!imageAttachment) return result;

        const isInFavorites = isFavorited(imageAttachment.url);

        // Modificar el menú
        if (result && typeof result.then === 'function') {
          return result.then((sheet) => {
            if (!sheet?.default) return sheet;

            const OriginalComponent = sheet.default;
            
            sheet.default = (props) => {
              const originalResult = OriginalComponent(props);
              
              try {
                if (originalResult?.props?.children) {
                  const children = originalResult.props.children;
                  
                  // Crear botón
                  const button = {
                    icon: isInFavorites ? "ic_trash_24px" : "ic_star_24px",
                    label: isInFavorites ? "Quitar de Favoritos" : "Guardar en Favoritos",
                    onPress: () => {
                      try {
                        if (isInFavorites) {
                          removeImage(imageAttachment.url);
                        } else {
                          addImage(imageAttachment.url, imageAttachment.filename);
                        }
                        LazyActionSheet.hideActionSheet();
                      } catch (error) {
                        console.error("[FavoriteImages] Error:", error);
                        showToast("❌ Error al procesar imagen");
                      }
                    }
                  };

                  // Agregar botón al menú
                  if (Array.isArray(children)) {
                    children.push(button);
                  } else if (children) {
                    originalResult.props.children = [children, button];
                  }
                }
              } catch (error) {
                console.error("[FavoriteImages] Error al modificar menú:", error);
              }

              return originalResult;
            };

            return sheet;
          });
        }

        return result;
      });

      patches.push(unpatch);
      
      console.log("[FavoriteImages] ✅ Plugin cargado");
      showToast("✅ FavoriteImages activado", getAssetIDByName("ic_check_24px"));

    } catch (error) {
      console.error("[FavoriteImages] Error crítico:", error);
      showToast("❌ Error al cargar FavoriteImages");
    }
  },

  onUnload: () => {
    try {
      patches.forEach(unpatch => unpatch?.());
      patches.length = 0;
      console.log("[FavoriteImages] Plugin descargado");
      showToast("FavoriteImages desactivado");
    } catch (error) {
      console.error("[FavoriteImages] Error al descargar:", error);
    }
  },

  settings: {
    FavoriteImages: {
      type: "custom",
      component: () => {
        const React = window.React;
        const { 
          View, 
          Text, 
          Image, 
          ScrollView, 
          TouchableOpacity, 
          StyleSheet,
          RefreshControl 
        } = window.ReactNative;

        const [refreshing, setRefreshing] = React.useState(false);
        const [images, setImages] = React.useState([...storage.images]);

        const onRefresh = React.useCallback(() => {
          setRefreshing(true);
          setImages([...storage.images]);
          setTimeout(() => setRefreshing(false), 500);
        }, []);

        const deleteImage = (imageId) => {
          try {
            storage.images = storage.images.filter(img => img.id !== imageId);
            setImages([...storage.images]);
            showToast("🗑️ Imagen eliminada");
          } catch (error) {
            console.error("[FavoriteImages] Error al eliminar:", error);
            showToast("❌ Error al eliminar");
          }
        };

        const styles = StyleSheet.create({
          container: {
            flex: 1,
            backgroundColor: "#2f3136",
            padding: 16
          },
          header: {
            marginBottom: 20
          },
          title: {
            color: "#ffffff",
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 8
          },
          counter: {
            color: "#b9bbbe",
            fontSize: 14
          },
          grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-start"
          },
          imageContainer: {
            margin: 4,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "#202225"
          },
          image: {
            width: 100,
            height: 100
          },
          emptyContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 60
          },
          emptyText: {
            color: "#72767d",
            fontSize: 16,
            textAlign: "center",
            marginBottom: 12
          },
          emptySubtext: {
            color: "#4f5058",
            fontSize: 13,
            textAlign: "center",
            paddingHorizontal: 40
          },
          hint: {
            color: "#72767d",
            fontSize: 12,
            textAlign: "center",
            marginTop: 20,
            paddingHorizontal: 20
          }
        });

        return React.createElement(ScrollView, {
          style: styles.container,
          refreshControl: React.createElement(RefreshControl, {
            refreshing: refreshing,
            onRefresh: onRefresh,
            colors: ["#5865f2"]
          })
        },
          React.createElement(View, { style: styles.header },
            React.createElement(Text, { style: styles.title }, "🖼️ Imágenes Favoritas"),
            React.createElement(Text, { style: styles.counter }, 
              images.length + " imagen" + (images.length !== 1 ? "es" : "") + " guardada" + (images.length !== 1 ? "s" : "")
            )
          ),

          images.length > 0
            ? React.createElement(View, { style: styles.grid },
                images.map((img) =>
                  React.createElement(TouchableOpacity, {
                    key: img.id,
                    style: styles.imageContainer,
                    onLongPress: () => deleteImage(img.id),
                    activeOpacity: 0.7
                  },
                    React.createElement(Image, {
                      source: { uri: img.url },
                      style: styles.image,
                      resizeMode: "cover"
                    })
                  )
                )
              )
            : React.createElement(View, { style: styles.emptyContainer },
                React.createElement(Text, { style: styles.emptyText }, 
                  "No tienes imágenes guardadas"
                ),
                React.createElement(Text, { style: styles.emptySubtext },
                  "Mantén presionada cualquier imagen en el chat y selecciona 'Guardar en Favoritos'"
                )
              ),

          images.length > 0 && React.createElement(Text, { style: styles.hint },
            "💡 Mantén presionada una imagen para eliminarla"
          )
        );
      }
    }
  }
};
