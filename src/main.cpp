#include <Arduino.h>
#include <AccelStepper.h>

auto PULSE1 = D5;
auto DIR1 = D6;

auto PULSE2 = D1;
auto DIR2 = D0;

AccelStepper stepperX = AccelStepper(1, PULSE1, DIR1);
AccelStepper stepperY = AccelStepper(1, PULSE2, DIR2);

void setup()
{
  stepperX.setMaxSpeed(1500);
  stepperX.setAcceleration(500);

  stepperY.setMaxSpeed(1500);
  stepperY.setAcceleration(500);
  // stepper1.moveTo(24);

  Serial.begin(115200);
}

String *readLine()
{
  static String result = "";
  static String line = "";
  while (Serial.available())
  {
    char c = Serial.read();
    Serial.write(c);

    if (c == '\n')
    {
      result = line;
      line = "";
      return &result;
    }
    else
    {
      line += c;
    }
  }
  return NULL;
}

const float STEPS_PER_1_DEGREE = (10000 / 360);
const int REPORT_STATUS_EVERY_MS = 100;

void loop()
{
  String *line = readLine();
  if (line != NULL)
  {
    if (line->length() > 0)
    {
      if (line->charAt(0) == String("X").charAt(0))
      {
        Serial.println(String("moving x: ") + line->substring(1));
        auto tgt = line->substring(1).toFloat();
        stepperX.moveTo(tgt * STEPS_PER_1_DEGREE);
      }
      if (line->charAt(0) == String("Y").charAt(0))
      {
        Serial.println(String("moving y: ") + line->substring(1));
        auto tgt = line->substring(1).toFloat();
        stepperY.moveTo(tgt * STEPS_PER_1_DEGREE);
      }
    }
  }

  // print stepper position every .5 seconds
  static unsigned long lastPrint = 0;
  static bool moving = false;
  if (stepperX.distanceToGo() != 0 || stepperY.distanceToGo() != 0)
  {
    moving = true;
    if (millis() - lastPrint > REPORT_STATUS_EVERY_MS)
    {
      lastPrint = millis();
      Serial.println(String("X:") + (stepperX.currentPosition() / STEPS_PER_1_DEGREE) + " " +
                     String("Y:") + (stepperX.currentPosition() / STEPS_PER_1_DEGREE));
    }
  }
  else if (moving)
  {
    // print final position
    moving = false;
    Serial.println(String("X:") + (stepperX.currentPosition() / STEPS_PER_1_DEGREE) + " " +
                   String("Y:") + (stepperX.currentPosition() / STEPS_PER_1_DEGREE));
  }

  stepperX.run();
  stepperY.run();
}