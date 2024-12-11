import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  GestureResponderEvent,
  ScrollView
} from "react-native";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { navigate } from "expo-router/build/global-state/routing";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const strapiUrl = "https://2e7a-37-64-102-102.ngrok-free.app";

export default function HomeScreen() {
  interface Record {
    userID: string;
    radarID: string;
    recordTime: number;
    recordDistance: number;
    recordSpeed: number;
  }

  const [recordData, setRecordData] = useState<Record[]>([]);

  const getRecords = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token !== null) {
      axios
        .get(strapiUrl + "/api/records?sort=recordSpeed:desc", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .then(async (res) => {
          if (res.data && res.data.data) {
            const updatedRecords = await Promise.all(
              res.data.data.map(async (record: any) => {
                try {
                  const user = await axios.get(
                    strapiUrl + "/api/users/" + record["userID"],
                    {
                      headers: {
                        Authorization: `Bearer ${token}`
                      }
                    }
                  );
                  record["userID"] = user.data.username;
                } catch (err) {
                  console.log(err);
                }
                return record;
              })
            );
            setRecordData(updatedRecords);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  useFocusEffect(
    useCallback(() => {
      getRecords();
    }, [])
  );

  return (
    <View style={styles.logContainer}>
      <Text style={styles.text}>Records</Text>
      <View style={styles.flex}>
        <Text style={styles.rec}>User</Text>
        <Text style={styles.rec}>ID radar</Text>
        <Text style={styles.rec}>Temps</Text>
        <Text style={styles.rec}>Distance</Text>
        <Text style={styles.rec}>Vitesse</Text>
      </View>
      {recordData &&
        recordData.length > 0 &&
        recordData.map((record, key) => (
          <ScrollView key={key}>
            <View style={styles.flex}>
              <Text style={styles.rec}>{record["userID"]}</Text>
              <Text style={styles.rec}>{record["radarID"]}</Text>
              <Text style={styles.rec}>
                {Math.ceil(record["recordTime"] / 1000)} sec
              </Text>
              <Text style={styles.rec}>{record["recordDistance"]} m</Text>
              <Text style={styles.rec}>{record["recordSpeed"]} Km/h</Text>
            </View>
          </ScrollView>
        ))}
      <Button
        title="Refresh"
        onPress={() => {
          getRecords();
        }}
      />
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
  },
  flex: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "white",
    borderBottomColor: "white"
  },
  rec: {
    margin: 4,
    color: "white",
    fontSize: 16
  }
});
