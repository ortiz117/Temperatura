import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDansjX7ng6UdHRbuhKC2kgXvTyrpMix9M",
  databaseURL: "https://temperaturaesp32-c4ac5-default-rtdb.firebaseio.com/",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const tempLabel = document.getElementById("temp");
const humLabel = document.getElementById("hum");

let tempData = [];
let humData = [];
let labels = [];

const ctx = document.getElementById('chart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [
      {
        label: 'Temperatura (°C)',
        data: tempData,
        borderColor: 'rgb(239, 68, 68)', /* Tailwind red-500 */
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
      },
      {
        label: 'Humedad (%)',
        data: humData,
        borderColor: 'rgb(59, 130, 246)', /* Tailwind blue-500 */
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false, /* Allow chart to resize freely */
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Valor',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Hora',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + (context.dataset.label.includes('Temperatura') ? ' °C' : ' %');
            }
            return label;
          }
        }
      },
      animation: {
        duration: 1000, // Animation duration in milliseconds
        easing: 'easeInOutQuart' // Easing function
      }
    }
  }
});

// Referencias a los datos en Firebase
const tempRef = ref(database, 'sensor/temperatura');
const humRef = ref(database, 'sensor/humedad');

// escuchar cambios en la temperatura
onValue(tempRef, (snapshot) => {
  const temperature = snapshot.val();
  if (temperature !== null) {
    const now = new Date().toLocaleTimeString();
    tempLabel.textContent = `${temperature.toFixed(2)} °C`;

    labels.push(now);
    tempData.push(temperature.toFixed(2));
    humData.push(humData.length > 0 ? humData[humData.length - 1] : 0);

    // solo los últimos 15 datos para el gráfico
    if (labels.length > 15) {
      labels.shift();
      tempData.shift();
      humData.shift();
    }
    chart.update();
  }
});

// cambios en la humedad
onValue(humRef, (snapshot) => {
  const humidity = snapshot.val();
  if (humidity !== null) {
    const now = new Date().toLocaleTimeString();
    humLabel.textContent = `${humidity.toFixed(2)} %`;

    if (labels.length === 0 || labels[labels.length - 1] !== now) {
      labels.push(now);
      tempData.push(tempData.length > 0 ? tempData[tempData.length - 1] : 0); // Keep temp consistent
      humData.push(humidity.toFixed(2));
    } else {
      // Update the last humidity value if the timestamp is the same
      humData[humData.length - 1] = humidity.toFixed(2);
    }


    // solo los últimos 15 datos para el gráfico
    if (labels.length > 15) {
      labels.shift();
      tempData.shift();
      humData.shift();
    }
    chart.update();
  }
});