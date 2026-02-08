import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUser } from "@clerk/clerk-expo";

import { db } from "@/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

/* -------------------- 配置 -------------------- */

const API_URL = "http://localhost:8081/api/translate";

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

const LANGUAGES = [
  { code: "en", name: "英语" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁体中文" },
  { code: "ja", name: "日语" },
  { code: "ko", name: "韩语" },
  { code: "fr", name: "法语" },
  { code: "de", name: "德语" },
  { code: "es", name: "西班牙语" },
  { code: "vi", name: "越南语" },
];

interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  targetLang: string;
}

/* ==================== 页面 ==================== */

export default function IndexScreen() {
  const { user } = useUser();
  const userId = user?.id;

  const [inputText, setInputText] = useState("");
  const [targetLang, setTargetLang] = useState("zh-CN");
  const [langModalVisible, setLangModalVisible] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  /* -------------------- Firestore 监听历史 -------------------- */

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "translations"),
      where("userId", "==", userId),
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HistoryItem, "id">),
      }));
      setHistory(list.reverse());
    });

    return () => unsub();
  }, [userId]);

  /* -------------------- 翻译（核心） -------------------- */

  const handleTranslate = async () => {
    if (!inputText.trim() || loading) return;
    if (!userId) return;

    const sourceText = inputText.trim();
    setLoading(true);

    try {
      // const res = await fetch(API_URL, {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          targetLang,
        }),
      });

      const data = await res.json();
      const translatedText = data.text;

      if (!translatedText) {
        throw new Error("No translation result");
      }

      await addDoc(collection(db, "translations"), {
        userId,
        sourceText,
        translatedText,
        targetLang,
        createdAt: new Date(),
      });

      setInputText("");
    } catch (err) {
      console.error(err);
      Alert.alert("翻译失败", "请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- 朗读 -------------------- */

  const handleSpeak = (text: string) => {
    Speech.speak(text, {
      language: LANG_TO_LOCALE[targetLang] ?? "en-US",
      rate: 0.9,
    });
  };

  /* -------------------- 删除历史 -------------------- */

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

  const getLangName = (code: string) =>
    LANGUAGES.find((l) => l.code === code)?.name ?? code;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        <Text style={styles.title}>AI 翻译</Text>

        {/* 目标语言 */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLangModalVisible(true)}
        >
          <Text>{getLangName(targetLang)}</Text>
          <Text>▼</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="输入要翻译的内容"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={styles.btn}
          onPress={handleTranslate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>翻译</Text>
          )}
        </TouchableOpacity>

        {/* 历史记录 */}
        {history.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historySource}>{item.sourceText}</Text>
              <Text style={styles.historyResult}>{item.translatedText}</Text>
            </View>

            <View style={styles.historyActions}>
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
      </ScrollView>

      {/* 语言选择 */}
      <Modal visible={langModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalBg}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>选择目标语言</Text>
            <ScrollView>
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={styles.langItem}
                  onPress={() => {
                    setTargetLang(l.code);
                    setLangModalVisible(false);
                  }}
                >
                  <Text>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

/* -------------------- 样式 -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  langBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  historyItem: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },
  historySource: { color: "#666", marginBottom: 4 },
  historyResult: { fontSize: 16 },
  historyActions: { justifyContent: "space-between" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  langItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
