import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react-native";

import { MusicasDefault } from "./data/musicas";

const STORAGE_KEY = "@ana_music_player:faixas:v2";

function formatarTempo(segundos) {
  if (!segundos || Number.isNaN(segundos) || segundos < 0) return "0:00";
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${min}:${String(seg).padStart(2, "0")}`;
}

export default function App() {
  const [faixas, setFaixas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [faixaAtualId, setFaixaAtualId] = useState(null);

  // Um único player para a lista inteira
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const tempoAtual = status?.currentTime ?? 0;
  const duracao = status?.duration ?? 0;
  const tocando = status?.playing ?? false;
  const faixaAtual = faixas.find((f) => f.id === faixaAtualId) ?? null;

  // 1) Configuração de áudio + carregar faixas persistidas (nome das faixas).
  useEffect(() => {
    async function inicializar() {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch (e) {
        console.warn("Falha ao configurar áudio:", e);
      }
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEY);
        if (salvo) {
          setFaixas(JSON.parse(salvo));
        } else {
          setFaixas(MusicasDefault);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(MusicasDefault)
          );
        }
      } catch (e) {
        console.warn("Falha ao carregar faixas:", e);
        setFaixas(MusicasDefault);
      } finally {
        setCarregando(false);
      }
    }
    inicializar();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") {
        try {
          player.pause();
        } catch (e) {
          console.warn("Falha ao pausar:", e);
        }
      }
    });
    return () => {
      subscription.remove();
      try {
        player.pause();
      } catch (e) {
        // ignora erro no cleanup
      }
    };
  }, [player]);

  async function persistir(novaLista) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
    } catch (e) {
      console.warn("Falha ao persistir faixas:", e);
    }
  }

  function alternarReproducao(faixa) {
    try {
      if (faixaAtualId === faixa.id) {
        if (tocando) {
          player.pause();
        } else {
          player.play();
        }
      } else {
        setFaixaAtualId(faixa.id);
        player.replace(faixa.url);
        player.play();
      }
    } catch (e) {
      console.warn("Falha ao reproduzir:", e);
    }
  }

  async function excluirFaixa(id) {
    if (id === faixaAtualId) {
      try {
        player.pause();
      } catch (e) {
        // ignora
      }
      setFaixaAtualId(null);
    }
    const novaLista = faixas.filter((f) => f.id !== id);
    setFaixas(novaLista);
    await persistir(novaLista);
  }

  async function restaurarLista() {
    try {
      player.pause();
    } catch (e) {
      // ignora
    }
    setFaixaAtualId(null);
    setFaixas(MusicasDefault);
    await persistir(MusicasDefault);
  }

  function renderItem({ item }) {
    const selecionada = item.id === faixaAtualId;
    const estaTocando = selecionada && tocando;
    return (
      <View style={[styles.card, selecionada && styles.cardAtivo]}>
        <View style={styles.cardTexto}>
          <Text style={styles.titulo} numberOfLines={2}>
            {item.titulo}
          </Text>
        </View>
        <View style={styles.botoes}>
          <TouchableOpacity
            style={styles.botaoPlay}
            onPress={() => alternarReproducao(item)}
            accessibilityLabel={estaTocando ? "Pausar" : `Tocar ${item.titulo}`}
          >
            {estaTocando ? (
              <Pause size={20} color="#fff" fill="#fff" />
            ) : (
              <Play size={20} color="#fff" fill="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoExcluir}
            onPress={() => excluirFaixa(item.id)}
            accessibilityLabel={`Excluir ${item.titulo}`}
          >
            <Trash2 size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.headerLinha}>
        <Headphones size={26} color="#1DB954" />
        <Text style={styles.header}>Ana Music Player</Text>
      </View>
      <Text style={styles.descricao}>
        {faixas.length} faixa(s) na lista • dados persistidos no aparelho
      </Text>

      {carregando ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : (
        <FlatList
          data={faixas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.listaFlex}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vazia}>
              <Text style={styles.vaziaTexto}>
                Lista vazia. Toque abaixo para restaurar.
              </Text>
            </View>
          }
        />
      )}

    
      <View style={styles.playerBox}>
        {faixaAtual ? (
          <>
            <View style={styles.agoraTocandoLinha}>
              {tocando ? (
                <Pause size={16} color="#1DB954" fill="#1DB954" />
              ) : (
                <Play size={16} color="#1DB954" fill="#1DB954" />
              )}
              <Text style={styles.agoraTocando} numberOfLines={1}>
                {tocando ? "Tocando:" : "Pausado:"} {faixaAtual.titulo}
              </Text>
            </View>
            <View style={styles.progressoLinha}>
              <Text style={styles.tempo}>{formatarTempo(tempoAtual)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duracao > 0 ? duracao : 0}
                value={Math.min(tempoAtual, duracao > 0 ? duracao : 0)}
                minimumTrackTintColor="#1DB954"
                maximumTrackTintColor="#444"
                thumbTintColor="#1DB954"
                onSlidingComplete={(valor) => {
                  try {
                    player.seekTo(valor);
                  } catch (e) {
                    console.warn("Falha ao buscar posição:", e);
                  }
                }}
              />
              <Text style={styles.tempo}>{formatarTempo(duracao)}</Text>
            </View>
            {status?.isBuffering && (
              <Text style={styles.buffer}>Carregando áudio…</Text>
            )}
          </>
        ) : (
          <View style={styles.nenhumaFaixaLinha}>
            <Play size={16} color="#888" />
            <Text style={styles.nenhumaFaixa}>
              Toque em play em uma faixa para começar a ouvir
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.botaoRestaurar} onPress={restaurarLista}>
        <RotateCcw size={16} color="#1DB954" />
        <Text style={styles.botaoRestaurarTexto}>
          Restaurar as 5 faixas originais
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  headerLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  descricao: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
  },
  listaFlex: {
    flex: 1,
  },
  lista: {
    paddingBottom: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  cardAtivo: {
    borderColor: "#1DB954",
  },
  cardTexto: {
    flex: 1,
    marginRight: 8,
  },
  titulo: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  botoes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botaoPlay: {
    backgroundColor: "#1DB954",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoExcluir: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
  },
  playerBox: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    minHeight: 86,
    justifyContent: "center",
  },
  agoraTocandoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  agoraTocando: {
    color: "#1DB954",
    fontWeight: "bold",
    flex: 1,
  },
  nenhumaFaixaLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  nenhumaFaixa: {
    color: "#888",
    textAlign: "center",
  },
  progressoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  tempo: {
    color: "#fff",
    fontSize: 12,
    minWidth: 38,
    textAlign: "center",
  },
  buffer: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  vazia: {
    alignItems: "center",
    marginTop: 40,
  },
  vaziaTexto: {
    color: "#888",
  },
  botaoRestaurar: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoRestaurarTexto: {
    color: "#1DB954",
    fontWeight: "bold",
  },
});
