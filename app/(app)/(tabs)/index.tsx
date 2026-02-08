import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "@/firebase";

const LANGS = [
  { label: "中文", value: "zh-CN" },
  { label: "英文", value: "en" },
  { label: "日文", value: "ja" },
];

export default function IndexScreen() {
  const { user } = useUser();
  const userId = user?.id;

  /** ===== 原有状态 ===== */
  const [inputText, setInputText] = useState("");
  const [targetLang, setTargetLang] = useState("zh-CN");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  /** ===== 新增：图片翻译状态 ===== */
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  /** ===== 原有：历史记录 ===== */
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "translations"),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.userId === userId);
      setHistory(list);
    });
  }, [userId]);

  /** ===== 新增：选图 ===== */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("需要相册权限");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 1,
    });

    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 || null);
    }
  };

  /** ===== 原翻译函数（只多传 image） ===== */
  const handleTranslate = async () => {
    if (loading) return;
    if (!inputText.trim() && !imageBase64) {
      Alert.alert("请输入文字或选择图片");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText.trim() || null,
          image: imageBase64 || null, // ⭐新增
          targetLang,
        }),
      });

      const data = await res.json();
      if (!data?.text) throw new Error("no result");

      await addDoc(collection(db, "translations"), {
        userId,
        sourceText: inputText || "[Image]",
        translatedText: data.text,
        targetLang,
        createdAt: new Date(),
      });

      setInputText("");
      setImageUri(null);
      setImageBase64(null);
    } catch {
      Alert.alert("翻译失败");
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = (id: string) => {
    Alert.alert("删除记录", "确定要删除这条翻译记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "translations", id));
        },
      },
    ]);
  };

  const LANG_TO_LOCALE: Record<string, string> = {
    en: "en-US",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    ja: "ja-JP",
    ko: "ko-KR",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    vi: "vi-VN",
  };

  const handleSpeak = (text: string) => {
    Speech.speak(text, {
      language: LANG_TO_LOCALE[targetLang] ?? "en-US",
      rate: 0.9,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>翻译</Text>

        {/* ===== 新增：图片预览 ===== */}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

        {/* ===== 新增：选图按钮 ===== */}
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Ionicons name="image-outline" size={18} />
          <Text style={{ marginLeft: 6 }}>图片翻译</Text>
        </TouchableOpacity>

        {/* ===== 原有：输入框 ===== */}
        <TextInput
          style={styles.input}
          placeholder="输入要翻译的文字"
          multiline
          value={inputText}
          onChangeText={setInputText}
        />

        {/* ===== 原有：目标语言选择 ===== */}
        <View style={styles.langRow}>
          {LANGS.map((l) => (
            <TouchableOpacity
              key={l.value}
              onPress={() => setTargetLang(l.value)}
            >
              <Text
                style={[
                  styles.lang,
                  targetLang === l.value && styles.langActive,
                ]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== 原有：翻译按钮 ===== */}
        <TouchableOpacity style={styles.translateBtn} onPress={handleTranslate}>
          <Text style={{ color: "#fff" }}>
            {loading ? "翻译中..." : "翻译"}
          </Text>
        </TouchableOpacity>

        {/* ===== 原有：历史记录 ===== */}
        <View style={{ marginTop: 24 }}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historySrc}>{item.sourceText}</Text>
              <Text style={styles.historyDst}>{item.translatedText}</Text>

              <View>
                <TouchableOpacity
                  onPress={() => handleSpeak(item.translatedText)}
                >
                  <Ionicons name="volume-high-outline" size={22} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteHistory(item.id)}>
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
  },
  imageBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  langRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 12,
  },
  lang: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  langActive: {
    backgroundColor: "#000",
    color: "#fff",
  },
  translateBtn: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  historyItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f6f6f6",
  },
  historySrc: { color: "#666", marginBottom: 4 },
  historyDst: { fontWeight: "600" },
});
