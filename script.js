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
        borderColor: 'red',
        backgroundColor: 'rgba(255,0,0,0.1)',
        tension: 0.3
      },
      {
        label: 'Humedad (%)',
        data: humData,
        borderColor: 'blue',
        backgroundColor: 'rgba(0,0,255,0.1)',
        tension: 0.3
      }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// Simular datos cada 2 segundos
setInterval(() => {
  const now = new Date().toLocaleTimeString();
  const temp = (Math.random() * 10 + 20).toFixed(2); // 20-30°C
  const hum = (Math.random() * 20 + 40).toFixed(2);  // 40-60%

  tempLabel.textContent = `${temp} °C`;
  humLabel.textContent = `${hum} %`;

  labels.push(now);
  tempData.push(temp);
  humData.push(hum);

  // Mantener solo los últimos 10 datos
  if (labels.length > 10) {
    labels.shift();
    tempData.shift();
    humData.shift();
  }

  chart.update();
}, 2000);
