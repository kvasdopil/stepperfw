#include <Arduino.h>
#include <AccelStepper.h>

auto PULSE = D5;
auto DIR = D6;

AccelStepper stepper1 = AccelStepper(1, PULSE, DIR);

void setup()
{
  stepper1.setMaxSpeed(1500);
  stepper1.setAcceleration(500);
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
  // // delay(1);
  // delayMicroseconds(500);
  // digitalWrite(D5, 0);
  // // delay(1);
  // delayMicroseconds(500);
  // if (target != pos)
  // {
  //   digitalWrite(DIR, target > pos ? 0 : 1);
  //   digitalWrite(D5, 1);
  //   target > pos ? pos++ : pos--;
  // }

  // stepper1.moveTo(8000);
  // stepper1.runToPosition();
  // stepper1.moveTo(0);
  // stepper1.runToPosition();

  String *line = readLine();
  if (line != NULL)
  {
    float target;
    Serial.println(String("Got command ") + line->c_str());
    sscanf(line->c_str(), "%f", &target);

    stepper1.moveTo(target * STEPS_PER_1_DEGREE);
  }

  // print stepper position every .5 seconds
  static unsigned long lastPrint = 0;
  static bool moving = false;
  if (stepper1.distanceToGo() != 0)
  {
    moving = true;
    if (millis() - lastPrint > REPORT_STATUS_EVERY_MS)
    {
      lastPrint = millis();
      Serial.println(stepper1.currentPosition() / STEPS_PER_1_DEGREE);
    }
  }
  else if (moving)
  {
    // print final position
    moving = false;
    Serial.println(stepper1.currentPosition() / STEPS_PER_1_DEGREE);
  }

  stepper1.run();
}