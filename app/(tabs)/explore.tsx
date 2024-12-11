import React, { useMemo } from "react";
import { useEffect, useState } from "react";
import { Circle, Marker, Polygon, Region } from "react-native-maps";
import MapView from "react-native-maps";
import { Button, StyleSheet, View } from "react-native";
import { ScrollView, Text } from "react-native";
import Checkbox from "expo-checkbox";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const API_URL_DATA =
  "https://tabular-api.data.gouv.fr/api/resources/8a22b5a8-4b65-41be-891a-7c0aead4ba51/data/";
const API_URL_PROFILE =
  "https://tabular-api.data.gouv.fr/api/resources/8a22b5a8-4b65-41be-891a-7c0aead4ba51/profile/";

const strapiUrl = "https://2e7a-37-64-102-102.ngrok-free.app";

type Position = {
  latitude: number;
  longitude: number;
};

type RadarData = Position & {
  __id: number | null;
  date_heure_dernier_changement: string | null;
  date_heure_creation: string | null;
  id: number;
  direction: string | null;
  equipement: string | null;
  date_installation: string | null;
  type: string;
  emplacement: string | null;
  route: string | null;
  longueur_troncon_km: number | null;
  vitesse_poids_lourds_kmh: number | null;
  vitesse_vehicules_legers_kmh: number | null;
};

type ApiData = {
  data: RadarData[];
  links: {
    next: string;
  };
  meta: {
    total: number;
    page_size: number;
  };
};

type ApiRadarType = {
  profile: {
    profile: {
      type: {
        tops: {
          value: string;
        }[];
      };
    };
  };
};

const INITIAL_POSITION = {
  latitude: 46.614066,
  longitude: 2.45468,
  latitudeDelta: 11,
  longitudeDelta: 11
};

const numberOfMarkers = 30;

const spreadFactor = 0.45; // Adjust this value to manage the spread between markers

const defaultLocationZoom = 0.007;
const radarBoxWidth = 0.0002;
const radarBoxHeight = 0.0001;

let timeEntered = 0;
let lastTimeEntered = 0;
let coordsEntered = { latitude: 0, longitude: 0 };

export default function App() {
  const [data, setData] = useState<RadarData[]>([]);
  const [radarType, setRadarType] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [region, setRegion] = useState<any>(INITIAL_POSITION);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [hasUserLocation, setHasUserLocation] = useState<boolean>(false);
  //const [timeEntered, setTimeEntered] = useState<number>(0);

  useEffect(() => {
    const getUserPosition = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasUserLocation(false);
        setRegion(INITIAL_POSITION);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setHasUserLocation(true);
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: defaultLocationZoom,
          longitudeDelta: defaultLocationZoom
        });
      } catch (error) {
        setHasUserLocation(false);
        setRegion(INITIAL_POSITION);
      }
    };

    getUserPosition();
  }, []);

  /**
   * Fetch the radar data from the API
   */
  useEffect(() => {
    const getRadars = async () => {
      const timeStarted = new Date().getTime();
      console.log("fetching radars");
      const firstPart = await fetch(API_URL_DATA);
      const firstJson = await firstPart.json();

      const allParts = await Promise.all(
        Array.from(
          { length: firstJson.meta.total / firstJson.meta.page_size - 1 },
          (_, i) => {
            return fetch(`${API_URL_DATA}?page=${i + 2}`);
          }
        )
      );
      const allPartsJson = await Promise.all(
        allParts.map((part) => part.json())
      );

      const allRadars = allPartsJson.map((part) => part.data).flat();
      const allData = firstJson.data.concat(allRadars);
      console.log(
        "radars fetched in",
        new Date().getTime() - timeStarted,
        "ms"
      );
      setData(allData);
      setDataLoaded(true);
    };
    getRadars();
  }, []);

  /**
   * Fetch the radar types from the API
   */
  useEffect(() => {
    const getRadarType = async (url: string) => {
      try {
        const response = await axios.get(url);
        const apiData = response.data as ApiRadarType;
        setRadarType((prevData) => [
          ...prevData,
          ...apiData.profile.profile.type.tops.map((item) => item.value)
        ]);
        setSelectedTypes((prevData) => [
          ...prevData,
          ...apiData.profile.profile.type.tops.map((item) => item.value)
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const checkAndFetchRadarType = async () => {
      getRadarType(API_URL_PROFILE);
    };

    checkAndFetchRadarType();
  }, []);

  /**
   * handle the checkbox change
   * @param type
   */
  const handleCheckboxChange = (type: string) => {
    setSelectedTypes((prevSelectedTypes) =>
      prevSelectedTypes.includes(type)
        ? prevSelectedTypes.filter((t) => t !== type)
        : [...prevSelectedTypes, type]
    );
  };

  /**
   * keeps only the markers that are within the bounds of the map, and with a defined density
   * @param RadarData[] markers
   */
  const selectMarkers = (
    markers: RadarData[],
    bounds: {
      latitudeMin: number;
      latitudeMax: number;
      longitudeMin: number;
      longitudeMax: number;
    }
  ) => {
    const isWithinBounds = (marker: RadarData) => {
      return (
        marker.latitude >= bounds.latitudeMin &&
        marker.latitude <= bounds.latitudeMax &&
        marker.longitude >= bounds.longitudeMin &&
        marker.longitude <= bounds.longitudeMax
      );
    };

    const filteredMarkers = markers.filter(isWithinBounds);

    const center = {
      latitude: (bounds.latitudeMin + bounds.latitudeMax) / 2,
      longitude: (bounds.longitudeMin + bounds.longitudeMax) / 2
    };

    const distanceToCenter = (marker: RadarData) => {
      return Math.sqrt(
        Math.pow(marker.latitude - center.latitude, 2) +
          Math.pow(marker.longitude - center.longitude, 2)
      );
    };

    filteredMarkers.sort((a, b) => distanceToCenter(a) - distanceToCenter(b));

    const minDistance =
      Math.sqrt(
        Math.pow(bounds.latitudeMax - bounds.latitudeMin, 2) +
          Math.pow(bounds.longitudeMax - bounds.longitudeMin, 2)
      ) /
      (numberOfMarkers * spreadFactor);

    const selectedMarkers: RadarData[] = [];
    filteredMarkers.forEach((marker) => {
      if (
        selectedMarkers.every((selectedMarker) => {
          const distance = Math.sqrt(
            Math.pow(marker.latitude - selectedMarker.latitude, 2) +
              Math.pow(marker.longitude - selectedMarker.longitude, 2)
          );
          return distance >= minDistance;
        })
      ) {
        selectedMarkers.push(marker);
      }
    });

    return selectedMarkers.slice(0, numberOfMarkers);
  };

  /**
   * Print the markers on the map
   */
  const printedMarkers = useMemo(
    () =>
      selectMarkers(
        data.filter((item) => selectedTypes.includes(item.type)),
        {
          latitudeMin: region.latitude - region.latitudeDelta / 2,
          latitudeMax: region.latitude + region.latitudeDelta / 2,
          longitudeMin: region.longitude - region.longitudeDelta / 2,
          longitudeMax: region.longitude + region.longitudeDelta / 2
        }
      ),
    [data, selectedTypes, region]
  );

  const handleUserLocationChange = (location: Location.LocationObject) => {
    const actualDate = new Date().getTime();
    // check if the user is inside a printed marker
    const userInsideMarker = printedMarkers.some((marker) => {
      return (
        location.coords.latitude >= marker.latitude - radarBoxHeight &&
        location.coords.latitude <= marker.latitude + radarBoxHeight &&
        location.coords.longitude >= marker.longitude - radarBoxWidth &&
        location.coords.longitude <= marker.longitude + radarBoxWidth
      );
    });

    const radar = printedMarkers.find((marker) => {
      return (
        location.coords.latitude >= marker.latitude - radarBoxHeight &&
        location.coords.latitude <= marker.latitude + radarBoxHeight &&
        location.coords.longitude >= marker.longitude - radarBoxWidth &&
        location.coords.longitude <= marker.longitude + radarBoxWidth
      );
    });
    if(!radar) {
      return;
    }

    const radarId = radar.id;

    // NOUVELLE Entrée dans une zone, avec un délai de 5 secondes entre chaque entrée
    if (
      userInsideMarker &&
      radarId &&
      timeEntered === 0 &&
      actualDate - lastTimeEntered > 5000
    ) {
      timeEntered = actualDate;
      lastTimeEntered = actualDate;
      coordsEntered = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } else if (!userInsideMarker && timeEntered !== 0) {
      const timeSpent = new Date().getTime() - timeEntered;
      const coordsExited = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const R = 6371e3; // Earth's radius in meters
      const φ1 = toRadians(coordsEntered.latitude);
      const φ2 = toRadians(coordsExited.latitude);
      const Δφ = toRadians(coordsExited.latitude - coordsEntered.latitude);
      const Δλ = toRadians(coordsExited.longitude - coordsEntered.longitude);

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = parseFloat((R * c).toFixed(2));
      const speed = parseFloat(((distance / (timeSpent / 1000)) * 3.6).toFixed(2));
      timeEntered = 0;

      saveData(timeSpent, distance, speed, radarId);
    }
  };

  function simulateSaveData() {
    setTimeout(() => {
      const timeSpent = Math.ceil(Math.random() * (15000 - 1000) + 1000);
      const distance = Math.ceil(Math.random() * (600 - 100) + 100);
      const speed = Math.ceil(Math.random() * (170 - 30) + 30); // 72 km/h
      const radarId = Math.ceil(Math.random() * (50 - 2) + 2);

      saveData(timeSpent, distance, speed, radarId);
    }, 3000); // wait for 3 seconds
  }

  useEffect(() => {
    // Call the function to simulate the saveData call
    //simulateSaveData();
  }, []);

  async function saveData(
    timeSpent: number,
    distance: number,
    speed: number,
    radarId: number
  ) {
    const token = await AsyncStorage.getItem("token");
    const userString = await AsyncStorage.getItem("user");
    const user: any = userString ? JSON.parse(userString) : null;
    if (!token || !user) {
      console.log("No token or user found");
      return;
    }
    axios
      .post(
        strapiUrl + "/api/records",
        {
          data: {
            recordTime: timeSpent,
            recordDistance: distance,
            recordSpeed: speed,
            radarID: radarId,
            userID: user.id
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ContentType: "application/json"
          }
        }
      )
      .then((res) => {
        console.log("Saved record !");
      })
      .catch((err) => {
        console.log(err.response);
      });
  }

  /**
   * Listen to user location changes
   */
  useEffect(() => {
    const locationSubscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 0.5
      },
      () => {}
    );

    return () => {
      locationSubscription.then((subscription) => subscription.remove());
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {dataLoaded &&
          radarType.map((type, index) => (
            <View key={index} style={styles.checkboxes}>
              <Checkbox
                value={selectedTypes.includes(type)}
                onValueChange={() => handleCheckboxChange(type)}
              />
              <Text style={styles.textStyle}>{type}</Text>
            </View>
          ))}
        {!dataLoaded && (
          <Text style={styles.textStyle}>Chargement des radars</Text>
        )}
      </ScrollView>

      <MapView
        style={styles.map}
        region={region}
        initialRegion={INITIAL_POSITION}
        onRegionChangeComplete={(region, isGesture) => {
          if (isGesture) {
            setRegion(region);
          }
        }}
        rotateEnabled={false}
        showsUserLocation={hasUserLocation}
        moveOnMarkerPress={false}
        onUserLocationChange={(event) => {
          const { coordinate } = event.nativeEvent;
          if (coordinate) {
            handleUserLocationChange({
              coords: {
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                altitude: coordinate.altitude,
                accuracy: coordinate.accuracy,
                heading: coordinate.heading,
                speed: coordinate.speed,
                altitudeAccuracy: coordinate.altitudeAccuracy ?? null
              },
              timestamp: coordinate.timestamp
            });
          }
        }}
      >
        {printedMarkers.map((item, index) =>
          region.latitudeDelta > 0.1 || region.longitudeDelta > 0.1 ? (
            <Marker
              key={index}
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude
              }}
            />
          ) : (
            <Polygon
              key={index}
              coordinates={[
                {
                  latitude: item.latitude + radarBoxHeight,
                  longitude: item.longitude + radarBoxWidth
                },
                {
                  latitude: item.latitude + radarBoxHeight,
                  longitude: item.longitude - radarBoxWidth
                },
                {
                  latitude: item.latitude - radarBoxHeight,
                  longitude: item.longitude - radarBoxWidth
                },
                {
                  latitude: item.latitude - radarBoxHeight,
                  longitude: item.longitude + radarBoxWidth
                }
              ]}
              strokeColor="#000000"
              strokeWidth={3}
            />
          )
        )}
      </MapView>
      <Button
        title="Ajouter un record"
        onPress={() => {
          simulateSaveData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    width: "100%",
    height: "80%"
  },
  checkboxes: {
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  textStyle: {
    color: "white",
    fontSize: 18
  },
  scrollView: {
    backgroundColor: "black",
    height: "20%",
    marginTop: 40,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10
  },
  userLocation: {
    backgroundColor: "dodgerblue",
    color: "white"
  },
  dotContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  }
});
