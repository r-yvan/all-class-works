#include <DHT.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
// DHT Sensor Setup
#define DPIN 2       // DHT11 data pin (GPIO4)
#define DTYPE DHT11  // Sensor type
DHT dht(DPIN, DTYPE);
// WiFi & MQTT Configuration
const char* ssid = "EdNet";      
const char* password = "Huawei@123";  
const char* mqtt_server = "157.173.101.159";  // MQTT Broker
WiFiClient espClient;
PubSubClient client(espClient);
void setup() {
  Serial.begin(9600);
  dht.begin();
  // Connect to WiFi
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  // Connect to MQTT Broker
  client.setServer(mqtt_server, 1883);
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect("ESP8266_Client")) {
      Serial.println("Connected to MQTT!");
    } else {
      Serial.print("Failed, retrying...");
      delay(2000);
    }
  }
}
void loop() {
  float temperature = dht.readTemperature();  // Celsius
  float humidity = dht.readHumidity();        // Humidity
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  // Publish data as JSON
  String payload = "\ttemperature\:" + String(temperature) + " Celsius" + " " +
                   ", \Humidity\:" + String(humidity) + " %";
  client.publish("/cyber-marines/y2b_room_temp/", payload.c_str());
  Serial.println("Publishing: " + payload);
  delay(5000); // Publish every 5 seconds
}