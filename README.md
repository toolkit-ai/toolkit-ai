# 🧰 Toolkit AI

Toolkit is an easy way to generate and use AI plugins. Generate code for 🦜 🔗 LangChain plugins by just describing what they should do.

## Usage

```typescript
import Toolkit from '@heypal/toolkit-ai';

// OpenAI API key can optionally be set here, or the underlying model
// will use the environment variable OPENAI_API_KEY
const toolkit = new Toolkit({
  openAIApiKey: '',
});

(async () => {
  const tool = await toolkit.generateTool({
    name: 'Temperature Converter',
    description:
      'Converts a temperature from Farenheit, Celsius, or Kelvin to any other unit.',
  });

  console.log(tool.langChainCode);
})();


```

### Result

```javascript
import { Tool } from 'langchain/agents';
import Ajv from 'ajv';

// The following is the actual code that will be
// run by the tool when it is called
function call({ value, fromUnit, toUnit }) {
  let convertedValue;

  if (fromUnit === "Fahrenheit") {
    if (toUnit === "Celsius") {
      convertedValue = ((value - 32) * 5) / 9;
    } else if (toUnit === "Kelvin") {
      convertedValue = ((value - 32) * 5) / 9 + 273.15;
    } else {
      convertedValue = value;
    }
  } else if (fromUnit === "Celsius") {
    if (toUnit === "Fahrenheit") {
      convertedValue = (value * 9) / 5 + 32;
    } else if (toUnit === "Kelvin") {
      convertedValue = value + 273.15;
    } else {
      convertedValue = value;
    }
  } else if (fromUnit === "Kelvin") {
    if (toUnit === "Fahrenheit") {
      convertedValue = ((value - 273.15) * 9) / 5 + 32;
    } else if (toUnit === "Celsius") {
      convertedValue = value - 273.15;
    } else {
      convertedValue = value;
    }
  }

  return { convertedValue };
}

// This is a class that corresponds to the Langchain tool definition
// https://js.langchain.com/docs/modules/agents/tools/
// It validates the input & output against the schemas
// and then it calls the tool code
class TemperatureConverter extends Tool {
  name = 'temperature-converter';
  
  description = `Converts a temperature from Fahrenheit, Celsius, or Kelvin to any other unit. The action input should adhere to this JSON schema:
{{"type":"object","properties":{{"value":{{"type":"number","description":"The temperature value to be converted."}},"fromUnit":{{"type":"string","enum":["Fahrenheit","Celsius","Kelvin"],"description":"The unit of the input temperature value."}},"toUnit":{{"type":"string","enum":["Fahrenheit","Celsius","Kelvin"],"description":"The unit to which the temperature value should be converted."}}}},"required":["value","fromUnit","toUnit"]}}`;
  
  ajv = new Ajv();

  inputSchema = {
    "type": "object",
    "properties": {
      "value": {
        "type": "number",
        "description": "The temperature value to be converted."
      },
      "fromUnit": {
        "type": "string",
        "enum": [
          "Fahrenheit",
          "Celsius",
          "Kelvin"
        ],
        "description": "The unit of the input temperature value."
      },
      "toUnit": {
        "type": "string",
        "enum": [
          "Fahrenheit",
          "Celsius",
          "Kelvin"
        ],
        "description": "The unit to which the temperature value should be converted."
      }
    },
    "required": [
      "value",
      "fromUnit",
      "toUnit"
    ]
  };
  
  outputSchema = {
    "type": "object",
    "properties": {
      "convertedValue": {
        "type": "number",
        "description": "The converted temperature value in the desired unit."
      }
    },
    "required": [
      "convertedValue"
    ]
  };

  validate(data, schema) {
    if (schema) {
      const validateSchema = this.ajv.compile(schema);
      if (!validateSchema(data)) {
        throw new Error(this.ajv.errorsText(validateSchema.errors));
      }
    }
  }

  async _call(arg) {
    let output;
    try {
      const input = JSON.parse(arg);
      this.validate(input, this.inputSchema);
      output = await call(input);
      try {
        this.validate(output, this.outputSchema);
      } catch (err) {
        throw new Error(`${err.message}: ${JSON.stringify(output)}`);
      }
    } catch (err) {
      output = { error: err.message || err };
    }
    return JSON.stringify(output);
  }
}

export default TemperatureConverter;
```