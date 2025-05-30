      // Configuración de Supabase
        const SUPABASE_CONFIG = {
            url: 'https://moemwzfqrzxkbqhaswaj.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZW13emZxcnp4a2JxaGFzd2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1Njc0MjUsImV4cCI6MjA2NDE0MzQyNX0.K1NxCr78RTHI81XkjEQBSXCVyuMtpzOFmEdUg7eldzk',
            table: 'sensor_data'
        };

        // Clase para manejar la conexión con Supabase
        class SupabaseClient {
            constructor(config) {
                this.supabase = window.supabase.createClient(config.url, config.anonKey);
                this.table = config.table;
                this.realtimeChannel = null;
            }

            async fetchInitialData(limit = 20) {
                try {
                    const { data, error } = await this.supabase
                        .from(this.table)
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(limit);

                    if (error) throw error;
                    return data.reverse();
                } catch (error) {
                    console.error('Error fetching initial data:', error);
                    throw error;
                }
            }

            subscribeToChanges(callback) {
                this.realtimeChannel = this.supabase
                    .channel('sensor_changes')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: this.table },
                        callback
                    )
                    .subscribe((status, err) => {
                        if (status === 'SUBSCRIBED') {
                            console.log('Subscribed to realtime changes');
                        } else if (status === 'CHANNEL_ERROR') {
                            console.error('Realtime channel error:', err);
                        }
                    });
            }

            unsubscribe() {
                if (this.realtimeChannel) {
                    this.realtimeChannel.unsubscribe();
                }
            }
        }

        // Clase para manejar el gráfico
        class SensorChart {
            constructor(canvasId) {
                this.ctx = document.getElementById(canvasId).getContext('2d');
                this.tempData = [];
                this.humData = [];
                this.labels = [];
                this.maxDataPoints = 20;
                
                this.chart = new Chart(this.ctx, {
                    type: 'line',
                    data: {
                        labels: this.labels,
                        datasets: [
                            {
                                label: 'Temperatura (°C)',
                                data: this.tempData,
                                borderColor: 'rgb(239, 68, 68)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: 'rgb(239, 68, 68)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4
                            },
                            {
                                label: 'Humedad (%)',
                                data: this.humData,
                                borderColor: 'rgb(59, 130, 246)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: 'rgb(59, 130, 246)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                hidden: true // Initially hide humidity
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: 'white',
                                bodyColor: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                borderWidth: 1
                            }
                        },
                        scales: {
                            x: {
                                display: true,
                                title: {
                                    display: true,
                                    text: 'Tiempo',
                                    font: { size: 14, weight: 'bold' }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            y: {
                                display: true,
                                title: {
                                    display: true,
                                    text: 'Valor',
                                    font: { size: 14, weight: 'bold' }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        },
                        animation: {
                            duration: 750,
                            easing: 'easeInOutQuart'
                        }
                    }
                });
            }

            addData(temperature, humidity, timestamp) {
                // Validar que los datos sean números válidos
                if (typeof temperature !== 'number' || typeof humidity !== 'number' || 
                    isNaN(temperature) || isNaN(humidity)) {
                    console.warn('Invalid data for chart:', { temperature, humidity });
                    return;
                }

                const timeLabel = new Date(timestamp).toLocaleTimeString();
                
                this.labels.push(timeLabel);
                this.tempData.push(temperature);
                this.humData.push(humidity);

                // Mantener solo los últimos N puntos
                if (this.labels.length > this.maxDataPoints) {
                    this.labels.shift();
                    this.tempData.shift();
                    this.humData.shift();
                }

                this.chart.update('none');
            }

            loadInitialData(data) {
                this.labels = [];
                this.tempData = [];
                this.humData = [];

                data.forEach(record => {
                    // Validar datos antes de añadir al gráfico
                    if (typeof record.temperature === 'number' && 
                        typeof record.humidity === 'number' && 
                        !isNaN(record.temperature) && 
                        !isNaN(record.humidity)) {
                        
                        const timeLabel = new Date(record.created_at).toLocaleTimeString();
                        this.labels.push(timeLabel);
                        this.tempData.push(record.temperature);
                        this.humData.push(record.humidity);
                    }
                });

                this.chart.update();
            }

            toggleDataset(index) {
                const dataset = this.chart.data.datasets[index];
                dataset.hidden = !dataset.hidden;
                this.chart.update();
            }
        }

        // Clase para manejar las estadísticas
        class Statistics {
            constructor() {
                this.temperatureData = [];
                this.humidityData = [];
            }

            updateData(data) {
                this.temperatureData = data.map(d => d.temperature);
                this.humidityData = data.map(d => d.humidity);
                this.updateDisplay();
            }

            addDataPoint(temperature, humidity) {
                this.temperatureData.push(temperature);
                this.humidityData.push(humidity);
                
                // Mantener solo los últimos 100 puntos para estadísticas
                if (this.temperatureData.length > 100) {
                    this.temperatureData.shift();
                    this.humidityData.shift();
                }
                
                this.updateDisplay();
            }

            calculateStats(data) {
                if (data.length === 0) return { max: 0, min: 0, avg: 0 };
                
                const max = Math.max(...data);
                const min = Math.min(...data);
                const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
                
                return { max, min, avg };
            }

            updateDisplay() {
                const tempStats = this.calculateStats(this.temperatureData);
                const humStats = this.calculateStats(this.humidityData);

                document.getElementById('temp-max').textContent = `${tempStats.max.toFixed(1)} °C`;
                document.getElementById('temp-min').textContent = `${tempStats.min.toFixed(1)} °C`;
                document.getElementById('temp-avg').textContent = `${tempStats.avg.toFixed(1)} °C`;

                document.getElementById('hum-max').textContent = `${humStats.max.toFixed(1)} %`;
                document.getElementById('hum-min').textContent = `${humStats.min.toFixed(1)} %`;
                document.getElementById('hum-avg').textContent = `${humStats.avg.toFixed(1)} %`;
            }
        }

        // Clase principal de la aplicación
        class DHT11Monitor {
            constructor() {
                this.supabaseClient = new SupabaseClient(SUPABASE_CONFIG);
                this.chart = new SensorChart('chart');
                this.statistics = new Statistics();
                
                this.elements = {
                    temp: document.getElementById('temp'),
                    hum: document.getElementById('hum'),
                    tempTime: document.getElementById('temp-time'),
                    humTime: document.getElementById('hum-time'),
                    status: document.getElementById('status'),
                    loading: document.getElementById('loading'),
                    toggleTemp: document.getElementById('toggle-temp'),
                    toggleHum: document.getElementById('toggle-hum')
                };

                this.init();
            }

            async init() {
                try {
                    this.setupEventListeners();
                    await this.loadInitialData();
                    this.subscribeToRealtimeUpdates();
                    this.updateStatus('connected', 'Conectado');
                } catch (error) {
                    console.error('Initialization error:', error);
                    this.updateStatus('error', 'Error de conexión');
                }
            }

            setupEventListeners() {
                this.elements.toggleTemp.addEventListener('click', () => {
                    this.chart.toggleDataset(0);
                    this.elements.toggleTemp.classList.toggle('opacity-50');
                });

                this.elements.toggleHum.addEventListener('click', () => {
                    this.chart.toggleDataset(1);
                    this.elements.toggleHum.classList.toggle('opacity-50');
                });
            }

            async loadInitialData() {
                try {
                    const data = await this.supabaseClient.fetchInitialData();
                    
                    if (data && data.length > 0) {
                        // Filtrar datos válidos
                        const validData = data.filter(record => this.validateSensorData(record));
                        
                        if (validData.length > 0) {
                            this.chart.loadInitialData(validData);
                            this.statistics.updateData(validData);
                            
                            const lastRecord = validData[validData.length - 1];
                            this.updateCurrentValues(lastRecord);
                        } else {
                            console.warn('No se encontraron datos válidos');
                            this.showNotification('No hay datos válidos disponibles', 'warning');
                        }
                    } else {
                        console.log('No hay datos disponibles');
                        this.showNotification('No hay datos disponibles', 'info');
                    }
                    
                    this.elements.loading.style.display = 'none';
                } catch (error) {
                    console.error('Error loading initial data:', error);
                    this.elements.loading.innerHTML = '<p class="text-red-600">Error al cargar datos: ' + error.message + '</p>';
                    this.showNotification('Error al cargar datos', 'error');
                }
            }

            subscribeToRealtimeUpdates() {
                this.supabaseClient.subscribeToChanges((payload) => {
                    console.log('Realtime update:', payload);
                    
                    if (payload.eventType === 'INSERT' && payload.new) {
                        const newRecord = payload.new;
                        
                        // Validar que los datos existan y sean números válidos
                        if (this.validateSensorData(newRecord)) {
                            this.updateCurrentValues(newRecord);
                            this.chart.addData(
                                newRecord.temperature, 
                                newRecord.humidity, 
                                newRecord.created_at
                            );
                            this.statistics.addDataPoint(newRecord.temperature, newRecord.humidity);
                            this.showNotification('Nuevos datos recibidos');
                        } else {
                            console.warn('Datos inválidos recibidos:', newRecord);
                            this.showNotification('Datos inválidos recibidos', 'warning');
                        }
                    }
                });
            }

            updateCurrentValues(record) {
                // Validar que los datos existan antes de mostrarlos
                if (!this.validateSensorData(record)) {
                    console.warn('Invalid sensor data:', record);
                    return;
                }

                const timestamp = new Date(record.created_at).toLocaleString();
                
                this.elements.temp.textContent = `${record.temperature.toFixed(1)} °C`;
                this.elements.hum.textContent = `${record.humidity.toFixed(1)} %`;
                this.elements.tempTime.textContent = `Última actualización: ${timestamp}`;
                this.elements.humTime.textContent = `Última actualización: ${timestamp}`;
            }

            validateSensorData(record) {
                return (
                    record &&
                    typeof record.temperature === 'number' &&
                    typeof record.humidity === 'number' &&
                    !isNaN(record.temperature) &&
                    !isNaN(record.humidity) &&
                    record.created_at
                );
            }

            updateStatus(type, message) {
                const statusClasses = {
                    connecting: 'bg-yellow-100 text-yellow-800',
                    connected: 'bg-green-100 text-green-800',
                    error: 'bg-red-100 text-red-800'
                };

                this.elements.status.className = `flex items-center px-4 py-2 rounded-full ${statusClasses[type]}`;
                this.elements.status.innerHTML = `
                    ${type === 'connecting' ? '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>' : ''}
                    ${type === 'connected' ? '<div class="w-4 h-4 bg-green-500 rounded-full mr-2"></div>' : ''}
                    ${type === 'error' ? '<div class="w-4 h-4 bg-red-500 rounded-full mr-2"></div>' : ''}
                    <span>${message}</span>
                `;
            }

            showNotification(message, type = 'info') {
                const colors = {
                    info: 'bg-blue-500',
                    success: 'bg-green-500', 
                    warning: 'bg-yellow-500',
                    error: 'bg-red-500'
                };

                const notification = document.createElement('div');
                notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
                notification.textContent = message;
                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.classList.remove('translate-x-full');
                }, 100);

                setTimeout(() => {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }

            destroy() {
                this.supabaseClient.unsubscribe();
            }
        }

        // Inicializar la aplicación cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', () => {
            window.dht11Monitor = new DHT11Monitor();
        });

        // Cleanup cuando se cierre la página
        window.addEventListener('beforeunload', () => {
            if (window.dht11Monitor) {
                window.dht11Monitor.destroy();
            }
        });