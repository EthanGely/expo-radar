import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  GestureResponderEvent
} from "react-native";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { navigate } from "expo-router/build/global-state/routing";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const strapiUrl = "https://2e7a-37-64-102-102.ngrok-free.app";

export default function HomeScreen() {
  const [username, setUsername] = useState("");
  const [usermail, setUserMail] = useState("");
  const [password, setPassword] = useState("");
  const [idk, setIdk] = useState(false);


  useFocusEffect(
    useCallback(() => {
      async function checkToken() {
        console.log("begin check token");
  
        const token = await AsyncStorage.getItem("token");
        if (token) {
          axios
            .get(strapiUrl + "/api/users/me", {
              headers: {
                Authorization: `Bearer ${token}`,
              }
            })
            .then((res) => {
              if (res.data.id) {
                router.navigate("/explore", { relativeToDirectory: true });
              } else {
                console.log("not logged in");
              }
            })
            .catch((err) => {
              console.log(err);
              console.log("not logged in");
            });
        } else {
          console.log("no token");
        }
      }
      checkToken();
    }, [])
  );

  const handleLogin = async (e: GestureResponderEvent) => {
    e.preventDefault();
    if (usermail.length > 0 && password.length > 0) {
      if (idk) {
        axios
          .post(
            strapiUrl + "/api/auth/local",
            {
              identifier: usermail,
              password: password
            },
            {
              headers: {
                ContentType: "application/json"
              }
            }
          )
          .then(async (res) => {
            if (res.data) {
              await AsyncStorage.setItem("token", res.data.jwt);
              await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
              router.navigate("./explore", { relativeToDirectory: true });
            }
          })
          .catch((err) => {
            console.log(err);
            console.log("this error");
          });
      } else {
        axios
          .post(
            strapiUrl + "/api/auth/local/register",
            {
              username: username,
              email: usermail,
              password: password
            },
            {
              headers: {
                ContentType: "application/json"
              }
            }
          )
          .then(async (res) => {
            if (res.data) {
              await AsyncStorage.setItem("token", res.data.jwt);
              await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
              console.log("redirect");
              router.navigate("/explore", { relativeToDirectory: true });
            }
          })
          .catch((err) => {
            console.log(err);
          });
      }
    }
  };

  return (
    <View style={styles.logContainer}>
      <Text style={styles.text}>{idk ? "Connexion" : "Inscription"}</Text>

      {!idk && (
        <View style={styles.formGroup}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Entrez votre nom d'utilisateur"
            placeholderTextColor="gray"
          />
        </View>
      )}
      <View style={styles.formGroup}>
        <TextInput
          style={styles.input}
          value={usermail}
          onChangeText={setUserMail}
          placeholder="Entrez votre adresse email"
          placeholderTextColor="gray"
        />
      </View>
      <View style={styles.formGroup}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Entrez votre mot de passe"
          placeholderTextColor="gray"
          secureTextEntry
        />
      </View>
      <Button
        title={idk ? "Se connecter" : "S'inscrire"}
        onPress={handleLogin}
      />
      <View style={styles.button}>
        <Button
          title={
            idk ? "Je n'ai pas encore de compte  ; (" : "J'ai déjà un compte"
          }
          onPress={() => {
            setIdk(!idk);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logContainer: {
    padding: 16,
    margin: "auto"
  },
  formGroup: {
    marginBottom: 12
  },
  input: {
    padding: 8,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 4,
    color: "white"
  },
  text: {
    color: "white",
    fontSize: 24
  },
  button: {
    marginTop: 12
  }
});
