import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { PdfCoordinateService, PdfCoordinate } from '../../../services/pdf-coordinate.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// --- NEW IMPORTS (from detection.component.ts) ---
// (You will need to adjust these paths if they are incorrect)
import { DashboardService, NotificationService } from '../../../services'; 
import { BASE_URL } from '../../../utils/constant';
import { PdfNavigationService } from '../../../services/pdf-navigation.service';
import { GRID_WIDGET_DATA } from '../../share-data';

declare global {
  interface Window {
    pdfjsLib: any;
  }
  // Add this interface to match the one from detection.component.ts
  interface ButtonConfig {
    id: string;
    label: string;
    name?: string;
    icon?: string;
    svgPath?: string;
    action: () => void;
  }
}

@Component({
  selector: 'app-detection',
  imports: [NgxExtendedPdfViewerModule, HttpClientModule, FormsModule, CommonModule],
  templateUrl: './detection.component.html',
  styleUrl: './detection.component.scss'
})
export class DetectionComponent implements OnInit, OnDestroy {
  // --- Existing Properties ---
  // I'm changing this to the full URL from your old component so the API call works
  // pdfSrc = 'http://orion:82/themes/uploads/test_drawings/WSS%20Combined%20Complete%20Set%20Plans.pdf';
  pdfSrc = '';
  height = '100vh';
  private pdfDocument: any = null;
  private currentPage: any = null; // <-- NEW: To track current page object

  // --- NEW Properties (from detection.component.ts) ---
  
  // XML Annotation State
  xmlDoc: Document | null = null;
  xmlUrl: string = ''; // Will be dynamically generated based on PDF path

  // Project Info
  projectId: string = '';
  projectNumber: string = '';
  revisionId: number = 1;
  revisionNo: number = 1;
  
  // Checkbox State
  checkboxes = {
    site: false,
    building: false,
    door: false,
    frame: false,
    hw : false,
    ta: false,
    legend : false,
    pdfControls: false
  };

  // Panel Drag/Toggle State
  panelPositions = {
    site: { x: 8, y: 8 },
    building: { x: 12, y: 40 },
    door: { x: 16, y: 40 },
    frame: { x: 20, y: 40 },
    hw: { x: 24, y: 40 },
    ta: { x: 30, y: 40 },
    legend : { x: 34, y: 40 },
    pdfControls: { x: 8, y: 80 }
  };
  checkboxGroupPosition = { x: 80, y: 0 }; // Adjusted initial X
  isCheckboxGroupDragging = false;
  checkboxGroupDragOffset = { x: 0, y: 0 };
  checkboxGroupOrientation = false; // false = horizontal
  private checkboxGroupSmartInteraction = { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false };

  alignmentGuides = {
    show: false,
    horizontal: [] as number[],
    vertical: [] as number[],
    snapThreshold: 15
  };
  
  draggingStates = { site: false, building: false, door: false, frame: false, hw : false, ta: false, legend : false, pdfControls: false };
  orientationStates = { site: true, building: true, door: true, frame: true, hw : true, ta: true, legend : true, pdfControls: true };
  dragOffsets = { site: { x: 0, y: 0 }, building: { x: 0, y: 0 }, door: { x: 0, y: 0 }, frame: { x: 0, y: 0 }, hw: { x: 0, y: 0 }, ta: { x: 0, y: 0 }, legend : { x: 0, y: 0 }, pdfControls: { x: 0, y: 0 } };
  
  private smartInteractionStates = {
    site: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    building: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    door: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    frame: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    hw: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    ta: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    legend : { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false },
    pdfControls: { startTime: 0, startPosition: { x: 0, y: 0 }, hasMoved: false }
  };

  // Button State
  selectedButtonId: string | null = null;
  
  // Button Definitions (Copied from detection.component.ts)
  buttonGroups = {
    site: [
      { id: 'site_building', label: 'BL', name: 'Building', action: () => this.onButtonClick('site_building') }
    ] as ButtonConfig[],
    building: [
      { id: 'building_floor', label: 'FL', name: 'Floor', action: () => this.onButtonClick('building_floor') },
      { id: 'building_room_name', label: 'RN', name: 'Room Name', action: () => this.onButtonClick('building_room_name') },
      { id: 'building_room_number', label: 'R#', name: 'Room Number', action: () => this.onButtonClick('building_room_number') },
      { id: 'building_unit_name', label: 'UN', name: 'Unit Name', action: () => this.onButtonClick('building_unit_name') },
    { id: 'building_unit_number', label: 'U#', name: 'Unit Number', action: () => this.onButtonClick('building_unit_number') },
    { id: 'building_unit_bath_name', label: 'BN', name: 'Unit Bath Name', action: () => this.onButtonClick('building_unit_bath_name') },
    { id: 'building_unit_bath_number', label: 'B#', name: 'Unit Bath Number', action: () => this.onButtonClick('building_unit_bath_number') },
    { id: 'building_opening_number', label: 'O#', name: 'Opening Number', action: () => this.onButtonClick('building_opening_number') },
    { id: 'building_wall_type', label: 'WT', name: 'Wall Type', action: () => this.onButtonClick('building_wall_type') },
    { id: 'building_ada', label: 'ADA', name: 'ADA', action: () => this.onButtonClick('building_ada') },
    { id: 'building_connecting', label: 'CN', name: 'Connecting', action: () => this.onButtonClick('building_connecting') },
    { id: 'building_balcony', label: 'BC', name: 'Balcony', action: () => this.onButtonClick('building_balcony') },
    { id: 'building_ta_tag', label: 'TA', name: 'TA Tag', action: () => this.onButtonClick('building_ta_tag') }
      // ... (add all other buttons from your old file) ...
    ] as ButtonConfig[],
    door: [
      { id: 'single_swing', label: 'SW1', name: 'Single Swing', action: () => this.onButtonClick('single_swing') },
      { id: 'double_swing', label: 'SW2', name: 'Double Swing', action: () => this.onButtonClick('double_swing') },
      { id: 'double_bypass', label: 'BP2', name: 'Double Bypass', action: () => this.onButtonClick('double_bypass') },
    { id: 'triple_bypass', label: 'BP3', name: 'Triple Bypass', action: () => this.onButtonClick('triple_bypass') },
    { id: 'quad_bypass', label: 'BP4', name: 'Quad Bypass', action: () => this.onButtonClick('quad_bypass') },
    { id: 'single_barn', label: 'BR1', name: 'Single Barn', action: () => this.onButtonClick('single_barn') },
    { id: 'double_barn', label: 'BR2', name: 'Double Barn', action: () => this.onButtonClick('double_barn') },
    { id: 'single_bifold', label: 'BF1', name: 'Single Bifold', action: () => this.onButtonClick('single_bifold') },
    { id: 'double_bifold', label: 'BF2', name: 'Double Bifold', action: () => this.onButtonClick('double_bifold') },
    { id: 'single_pocket', label: 'P01', name: 'Single Pocket', action: () => this.onButtonClick('single_pocket') },
    { id: 'double_pocket', label: 'P02', name: 'Double Pocket', action: () => this.onButtonClick('double_pocket') }
    ] as ButtonConfig[],
    frame: [
      { id: 'wrap_around', label: 'WR', name: 'Wrap Around', action: () => this.onButtonClick('wrap_around') },
      { id: 'butt', label: 'BT', name: 'Butt', action: () => this.onButtonClick('butt') }
    ] as ButtonConfig[],
    hw: [
      { id: 'hw_set', label: 'HW', name: 'HW Set', action: () => this.onButtonClick('hw_set') }
    ] as ButtonConfig[],
    ta: [] as ButtonConfig[],
    legend: [] as ButtonConfig[],
  };
  pageNumber: number = 1;
  isLoading: boolean = false;
  

  constructor(
    private coordinateService: PdfCoordinateService,
    private http: HttpClient,
    // --- NEW INJECTION ---
    @Inject(GRID_WIDGET_DATA) private widgetData: BehaviorSubject<any>,
    private dashboardService: DashboardService,
    private pdfNav: PdfNavigationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.configureWorker();
  this.pdfNav.state$.subscribe(state => {
    console.log('PdfNav state received:', state);
    if (state.url && state.url !== this.pdfSrc) {
      // Only reload PDF if the URL changed and is not empty
      console.log('Updating PDF URL from:', this.pdfSrc, 'to:', state.url);
      this.pdfSrc = state.url;
      this.pageNumber = state.page || 1;
      // Generate PDF-specific XML URL and load annotations
      this.generateXmlUrlFromPdfPath();
      this.loadXmlAnnotations();
    } else if (state.page && state.page !== this.pageNumber) {
      // Same PDF: only update page
      this.pageNumber = state.page || 1;
      console.log('Updating page to:', this.pageNumber);
    }
    this.isLoading = state.isLoading || false;
    this.dashboardService.setComponentLoading('detection', false);
  });
    // Listen for project changes from header
    window.addEventListener('dashboardHeaderEvent', this.handleHeaderEvent.bind(this));
  }



  ngOnDestroy() {
    // Clean up event listener
    window.removeEventListener('dashboardHeaderEvent', this.handleHeaderEvent.bind(this));
  }

  private configureWorker() {
    if (typeof window !== 'undefined') {
      window.pdfjsLib = window.pdfjsLib || {};
      window.pdfjsLib.GlobalWorkerOptions = {
        workerSrc: '/assets/pdf.worker.min.js'
      };
      console.log('✅ PDF.js Worker configured');
    }
  }
  /**
   * Generate PDF-specific XML annotation file path
   * Creates a unique filename based on the PDF path
   */
  private generateXmlUrlFromPdfPath(): void {
    if (!this.pdfSrc) {
      console.warn('No PDF source available to generate XML URL');
      this.xmlUrl = '';
      return;
    }

    try {
      // Extract filename from PDF path
      const pdfPath = this.pdfSrc;
      let fileName = '';
      
      if (pdfPath.includes('/')) {
        // Extract filename from path
        fileName = pdfPath.split('/').pop() || '';
      } else {
        fileName = pdfPath;
      }

      // Remove .pdf extension and add .xml
      const baseFileName = fileName.replace(/\.pdf$/i, '');
      const xmlFileName = `${baseFileName}_annotations.xml`;
      
      // Create the XML URL - this will be used for API calls
      // The actual file will be stored on the server
      this.xmlUrl = `/themes/uploads/annotations/${encodeURIComponent(xmlFileName)}`;
      
      console.log('Generated XML URL for PDF:', {
        pdfPath: this.pdfSrc,
        fileName: fileName,
        xmlFileName: xmlFileName,
        xmlUrl: this.xmlUrl
      });
    } catch (error) {
      console.error('Error generating XML URL from PDF path:', error);
      this.xmlUrl = '';
    }
  }

  // --- MODIFIED: `onPageRendered` ---
  // This is now the core of the rendering logic
  onPageRendered(event: any): void {
    const pageView = event.source;
    const pageElement = pageView.div as HTMLElement;
    const pageNumber = event.pageNumber;
    const pdfDocument = pageView.pdfDocument;
    const viewport = pageView.viewport;

    // Store the PDF.js page object
    this.currentPage = pageView.pdfPage;

    // Initialize service if new document
    if (pdfDocument && this.pdfDocument !== pdfDocument) {
      console.log('New PDF document loaded. Initializing coordinate service.');
      this.pdfDocument = pdfDocument;
      this.coordinateService.initializePdfDocument(this.pdfDocument);
    }
    
    // Store viewport
    if (viewport) {
      this.coordinateService.setPageViewport(pageNumber, viewport);
    } else {
      console.warn(`No viewport found in onPageRendered event for page ${pageNumber}`);
      return; 
    }

    // Set up coordinate tracking (click listener)
    if (pageElement && !(pageElement as any)._coordinateTrackingSetup) {
      console.log(`Setting up coordinate tracking for page ${pageNumber}`);
      (pageElement as any)._coordinateTrackingSetup = true;
      
      pageElement.addEventListener('click', (mouseEvent: MouseEvent) => {
        this.handlePageClick(mouseEvent, pageNumber);
      });

      pageElement.addEventListener('touchstart', (touchEvent: TouchEvent) => {
        touchEvent.preventDefault();
        this.handlePageTouch(touchEvent, pageNumber);
      });
    }
    
    // --- NEW: Render SVG Overlay ---
    // This replaces the simple div-based rendering
    
    // Make sure page div is ready for absolutely positioned children
    pageElement.style.position = 'relative';

    // Clear any old SVG overlay from this page div
    pageElement.querySelector('.annotation-svg-overlay')?.remove();

    // Create a new SVG overlay for this page
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'annotation-svg-overlay');
    // Set SVG size from viewport
    svg.setAttribute('width', viewport.width.toString());
    svg.setAttribute('height', viewport.height.toString());

    pageElement.appendChild(svg);

    // Call the robust XML rendering function
    if (this.xmlDoc) {
      this.renderXmlAnnotations(svg, viewport, pageNumber);
    }
  }

  // --- MODIFIED: `handlePageClick` ---
  // This now triggers the API call
  private handlePageClick(event: MouseEvent, pageNumber: number): void {
    // 1. Check if a button is selected
    if (!this.selectedButtonId) {
      // ... (original coordinate logging logic is fine) ...
      const coordinates = this.coordinateService.getPdfCoordinates(event, pageNumber);
      if (coordinates) {
        this.coordinateService.logCoordinates(coordinates);
        this.coordinateService.copyCoordinatesToClipboard(coordinates);
        this.showCoordinateNotification(coordinates);
      }
      return;
    }

    // 2. A button IS selected. Get Top-Left coordinates (System 1).
    const coordinates = this.coordinateService.getPdfCoordinates(event, pageNumber);
    if (!coordinates) return;

    // --- THIS IS THE FIX ---
    // 3. Prepare for API (Still System 1)
    // Our service, XML, and API all use TOP-LEFT coordinates.
    // We send the coordinates from the service directly.
    const pdfX = coordinates.x;
    const pdfY_top_left = coordinates.y; 

    console.log(`Calling API. Button: ${this.selectedButtonId}, Page: ${pageNumber}, X: ${pdfX.toFixed(2)}, Y (Top-Left): ${pdfY_top_left.toFixed(2)}`);

    // 4. Call the API with TOP-LEFT coordinates
    this.extractTextAtLocation(pdfX, pdfY_top_left, pageNumber, this.selectedButtonId);
    
  }

  // Handle touch (simplified, can be expanded)
  private handlePageTouch(event: TouchEvent, pageNumber: number): void {
    if (!this.selectedButtonId) {
      const coordinates = this.coordinateService.getPdfCoordinatesFromTouch(event, pageNumber);
      if (coordinates) {
        this.coordinateService.logCoordinates(coordinates);
        this.coordinateService.copyCoordinatesToClipboard(coordinates);
        this.showCoordinateNotification(coordinates);


      }
      return;
    }
    // ... (Add logic for touch-based annotation creation if needed) ...
  }

  // --- ALL NEW METHODS (Copied & Adapted from detection.component.ts) ---

  // Button click (selects button)
  onButtonClick(buttonId: string): void {
    if (this.selectedButtonId === buttonId) {
      this.selectedButtonId = null;
    } else {
      this.selectedButtonId = buttonId;
    }
    console.log('Selected button:', this.selectedButtonId);
  }

  // Robust XML Loader - Now handles PDF-specific annotations
  async loadXmlAnnotations(): Promise<void> {
    if (!this.xmlUrl) {
      console.warn('⚠️ No XML URL available, creating new annotations document');
      const parser = new DOMParser();
      this.xmlDoc = parser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><annotations></annotations>', 'application/xml');
      return;
    }

    try {
      console.log('🎨 Loading PDF-specific XML Annotations from:', this.xmlUrl);
      
      // Use the dashboard service to load annotations
      const response: any = await lastValueFrom(
        this.dashboardService.loadXmlAnnotations(this.xmlUrl)
      );
      // console.log("🚀 ~ DetectionComponent ~ loadXmlAnnotations ~ response:", response);
      
    const parser = new DOMParser();
    this.xmlDoc = parser.parseFromString(response, 'application/xml');

     const parserError = this.xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('❌ XML parsing error:', parserError.textContent);
      this.xmlDoc = parser.parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><annotations></annotations>',
        'application/xml'
      );
    } else {
      console.log('✅ PDF-specific XML annotations loaded successfully');
    }
    } catch (error) {
      console.error('❌ Error loading PDF-specific XML annotations:', error);
      const parser = new DOMParser();
      this.xmlDoc = parser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><annotations></annotations>', 'application/xml');
    }
  }

  // Render XML onto a specific SVG overlay
  /**
   * Render XML onto a specific SVG overlay
   * --- UPDATED TO HANDLE <highlight> FORMAT ---
   */
  renderXmlAnnotations(svg: SVGElement, pageViewport: any, pageNumber: number): void {
  if (!this.xmlDoc || !pageViewport) {
    console.warn('Cannot render annotations: missing xmlDoc or viewport.');
    return;
  }

  // 1. Compute unscaled PDF page height (needed for Y-axis flip)
  const unscaledPageHeight = pageViewport.height / pageViewport.scale;

  // 2. Find the <page> node for this page
  const pageNode = this.xmlDoc.querySelector(`page[number="${pageNumber}"]`);
  if (!pageNode) {
    console.log(`No annotations found for page ${pageNumber}`);
    return;
  }

  // 3. Collect all <annotation> elements
  const annotations = Array.from(pageNode.getElementsByTagName('annotation'));
  console.log(`Rendering ${annotations.length} XML annotations for page ${pageNumber}. Using Top-Left coordinate system.`);

  // 4. Iterate through each annotation
  for (const node of annotations) {
    const type = node.getAttribute('type') || 'generic';
    const x = parseFloat(node.getAttribute('x') || '0');
    const y = parseFloat(node.getAttribute('y') || '0');
    const width = parseFloat(node.getAttribute('width') || '0');
    const height = parseFloat(node.getAttribute('height') || '0');

    // 5. Choose color (reuse same logic if available)
    const color = this.getButtonHighlightColor
      ? this.getButtonHighlightColor(type)
      : 'rgba(255,165,0,0.4)'; // fallback orange

    // --- Coordinate Conversion ---
    // System 1 → System 2: flip Y from top-left to bottom-left
    const y_bottom_edge_tl = y;
    const y_bl_pdf = unscaledPageHeight - y_bottom_edge_tl;

    // System 2 → System 3: convert to viewport coordinates
    const [viewportX, viewportY] = pageViewport.convertToViewportPoint(x, y_bl_pdf);
    const scaledWidth = width * pageViewport.scale;
    const scaledHeight = height * pageViewport.scale;

    // --- Draw SVG rectangle ---
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', `${viewportX}`);
    rect.setAttribute('y', `${viewportY}`);
    rect.setAttribute('width', `${scaledWidth}`);
    rect.setAttribute('height', `${scaledHeight}`);
    // For legend: no fill, only border. For others: normal fill
    rect.setAttribute('fill', type === 'legend' ? 'none' : color);
    rect.setAttribute('stroke', type === 'legend' ? color.replace('0.4', '1') : color.replace('0.4', '0.8'));
    rect.setAttribute('stroke-width', type === 'legend' ? '2' : '1');
    rect.setAttribute('class', `xml-annotation-${type}`);

    svg.appendChild(rect);

    // If this is a legend annotation, also render the label
    if (type === 'legend') {
      const textElement = node.querySelector('text');
      const legendText = textElement ? textElement.textContent || '' : '';
      
      if (legendText) {
        // Truncate text if too long
        const displayText = legendText.length > 40 ? legendText.substring(0, 40) + '...' : legendText;
        
        // Calculate text dimensions (approximate)
        const fontSize = 9;
        const textWidth = displayText.length * 5.5; // Approximate character width
        const textHeight = 14;
        const padding = 3;
        
        // Position at top-right corner (outside the box)
        const labelX = viewportX + scaledWidth - textWidth - padding;
        const labelY = viewportY - textHeight - 2; // Above the box
        
        // Add a background for better readability
        const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        textBg.setAttribute("x", `${labelX - padding}`);
        textBg.setAttribute("y", `${labelY - padding}`);
        textBg.setAttribute("width", `${textWidth + padding * 2}`);
        textBg.setAttribute("height", `${textHeight}`);
        textBg.setAttribute("fill", "rgba(255, 255, 255, 0.95)");
        textBg.setAttribute("stroke", "#666");
        textBg.setAttribute("stroke-width", "0.5");
        textBg.setAttribute("rx", "2");
        svg.appendChild(textBg);

        // Draw the label text at the top-right outside of the bounding box
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", `${labelX}`);
        text.setAttribute("y", `${labelY + fontSize}`);
        text.setAttribute("fill", "#333");
        text.setAttribute("font-size", `${fontSize}px`);
        text.setAttribute("font-weight", "600");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.setAttribute("class", "legend-label");
        text.textContent = displayText;
        svg.appendChild(text);
      }
    }
  }
}


  /**
   * Helper function to get color for an annotation type
   */
  getButtonHighlightColor(buttonId: string): string {
    const colorMap: Record<string, string> = {
      // Site
      'site_building': 'rgba(135, 123, 152, 0.4)',
      // Building
      'building_floor': 'rgba(195, 190, 92, 0.4)',
      'building_room_name': 'rgba(195, 190, 92, 0.4)',
      'building_room_number': 'rgba(195, 190, 92, 0.4)',
      'building_unit_name': 'rgba(195, 190, 92, 0.4)',
      'building_unit_number': 'rgba(195, 190, 92, 0.4)',
      'building_unit_bath_name': 'rgba(195, 190, 92, 0.4)',
      'building_unit_bath_number': 'rgba(195, 190, 92, 0.4)',
      'building_opening_number': 'rgba(195, 190, 92, 0.4)',
      'building_wall_type': 'rgba(195, 190, 92, 0.4)',
      'building_ada': 'rgba(195, 190, 92, 0.4)',
      'building_connecting': 'rgba(195, 190, 92, 0.4)',
      'building_balcony': 'rgba(195, 190, 92, 0.4)',
      'building_ta_tag': 'rgba(195, 190, 92, 0.4)',
      // Door
      'single_swing': 'rgba(90, 102, 98, 0.4)',
      'double_swing': 'rgba(90, 102, 98, 0.4)',
      'double_bypass': 'rgba(90, 102, 98, 0.4)',
      'triple_bypass': 'rgba(90, 102, 98, 0.4)',
      'quad_bypass': 'rgba(90, 102, 98, 0.4)',
      'single_barn': 'rgba(90, 102, 98, 0.4)',
      'double_barn': 'rgba(90, 102, 98, 0.4)',
      'single_bifold': 'rgba(90, 102, 98, 0.4)',
      'double_bifold': 'rgba(90, 102, 98, 0.4)',
      'single_pocket': 'rgba(90, 102, 98, 0.4)',
      'double_pocket': 'rgba(90, 102, 98, 0.4)',
      // Frame
      'wrap_around': 'rgba(101, 151, 132, 0.4)',
      'butt': 'rgba(101, 151, 132, 0.4)',
      // HW
      'hw_set': 'rgba(119, 140, 151, 0.4)',
      // Legend
      'legend': 'rgba(203, 175, 206, 0.4)',
      // XML 'box' type
      'box': 'rgba(0, 123, 255, 0.15)',
    };
    
    return colorMap[buttonId] || 'rgba(255, 255, 0, 0.4)'; // Default yellow
  }

  // Call API
  async extractTextAtLocation(x: number, y: number, pageNumber: number, buttonId: string): Promise<void> {
    try {
      // Use pdfSrc (which we set to the full URL)
      const relativePath = this.pdfSrc.split("orionprojects")[1];
      if (!relativePath) {
        console.error("Cannot extract API path from pdfSrc. 'orionprojects' not found.", this.pdfSrc);
        return;
      }
      
      const trimmedPath = `orionprojects${relativePath}`;
      const requestBody = { 
        pdf_file_path: trimmedPath,
        x, y, page: pageNumber, buttonId 
      };
      console.log('Making API call with:', requestBody);
  
      const response: any = await lastValueFrom(
        this.dashboardService.getTextonDrop(requestBody)
      );
      //  const response: any =  []; // --- MOCK RESPONSE FOR TESTING ---
  
  
      console.log('Service Response:', response);
  
      if (response?.data?.data?.bboxes?.length > 0) {
        const bboxes = typeof response.data.data.bboxes[0] === 'number' 
          ? [response.data.data.bboxes] 
          : response.data.data.bboxes;
        
        // Call the adapted highlight function
        this.highlightTextRegions(pageNumber, bboxes, response.data.data.text, buttonId);
      } else {
        console.warn('No bounding boxes returned from API.');
        this.notificationService.showError('No bounding boxes returned from API.', 3500);
        // Here you could call your `createManualRectangle` logic if you port that over
      }

      // Handle legend if present
      if (response?.data?.data?.legend && response.data.data.legend.bbox) {
        const legend = response.data.data.legend;
        console.log('Legend detected:', legend);
        
        // Extract legend properties
        const legendPage =  pageNumber;
        const legendBbox = legend.bbox; // [x1, y1, x2, y2]
        const legendText = legend.text || '';
        
        // Highlight legend region with label
        this.highlightLegendRegion(legendPage, legendBbox, legendText, buttonId);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
    }
  }

  // Add highlight to XML and draw it on the *visible* SVG
 
  /**
   * Add highlight to XML and draw it on the *visible* SVG
   * --- UPDATED TO USE <highlight> FORMAT ---
   */
  highlightTextRegions(pageNumber: number, bboxes: number[][], detectedText: string, buttonId: string) {
    if (!this.xmlDoc) {
      console.error("Cannot save annotation, xmlDoc is not loaded.");
      return;
    }

    // 1. Get Viewport and Page Height
    const viewport = this.coordinateService['pageViewports'].get(pageNumber);
    if (!viewport) {
      console.error(`No viewport for page ${pageNumber}. Cannot draw highlight.`);
      return;
    }
    const unscaledPageHeight = viewport.height / viewport.scale;
    
    const pageElement = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
    const svg = pageElement?.querySelector('.annotation-svg-overlay') as SVGElement | null;
    
    // 2. Find or Create the <page> node
    let pageNode = this.xmlDoc.querySelector(`page[number="${pageNumber}"]`);
    if (!pageNode) {
      pageNode = this.xmlDoc.createElement('page');
      pageNode.setAttribute('number', pageNumber.toString());
      this.xmlDoc.documentElement.appendChild(pageNode);
    }

    // --- THIS IS THE FIX ---
    // Assume bboxes = [x1_tl, y1_tl, x2_tl, y2_tl] (System 1: Top-Left)
    for (const [x1_tl, y1_tl, x2_tl, y2_tl] of bboxes) {
      const color = this.getButtonHighlightColor(buttonId);

      // 3. Convert bbox (top-left) to (x, y, w, h) (top-left)
      const x = Math.min(x1_tl, x2_tl);
      const y = Math.min(y1_tl, y2_tl);
      const width = Math.abs(x2_tl - x1_tl);
      const height = Math.abs(y2_tl - y1_tl);
      
      // 4. Create <annotation> node with TOP-LEFT coords (System 1)
      const annotationNode = this.xmlDoc.createElement("annotation");
      annotationNode.setAttribute("type", buttonId);
      annotationNode.setAttribute("x", x.toFixed(2));
      annotationNode.setAttribute("y", y.toFixed(2)); // Save top-left y
      annotationNode.setAttribute("width", width.toFixed(2));
      annotationNode.setAttribute("height", height.toFixed(2));
      
      // Add text content as child element (stored in XML, not displayed on PDF)
      if (detectedText) {
        const textNode = this.xmlDoc.createElement("text");
        textNode.textContent = detectedText;
        annotationNode.appendChild(textNode);
      }
      
      pageNode.appendChild(annotationNode);

      // 5. Draw on visible SVG (if it exists)
      if (svg) {
        // 5a. Translate from Top-Left (System 1) to Bottom-Left (System 2)
        // This is the *only* place we flip the Y-coordinate.
        const y_bottom_edge_tl = y ;
        const y_bl_pdf = unscaledPageHeight - y_bottom_edge_tl;

        // 5b. Convert Bottom-Left (System 2) to Viewport (System 3)
        const [viewportX, viewportY] = viewport.convertToViewportPoint(x, y_bl_pdf);
        
        const scaledWidth = width * viewport.scale;
        const scaledHeight = height * viewport.scale;

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", `${viewportX}`);
        rect.setAttribute("y", `${viewportY}`); // This is now the correct top-left pixel
        rect.setAttribute("width", `${scaledWidth}`);
        rect.setAttribute("height", `${scaledHeight}`);
        rect.setAttribute("fill", color);
        rect.setAttribute('stroke', color.replace('0.4', '0.8'));
        rect.setAttribute('stroke-width', '1');
        svg.appendChild(rect);
      }
    }

    this.saveXmlToServer(buttonId, detectedText);
  }

  /**
   * Highlight legend region with label
   * Handles legend bounding box from API response
   */
  highlightLegendRegion(pageNumber: number, bbox: number[], legendText: string, buttonId: string) {
    const color = this.getButtonHighlightColor(buttonId);
  //  pageNumber = pageNumber +1; // Adjust for 1-based indexing
    if (!this.xmlDoc) {
      console.error("Cannot save legend annotation, xmlDoc is not loaded.");
      return;
    }

    // 1. Get Viewport and Page Height
    const viewport = this.coordinateService['pageViewports'].get(pageNumber);
    if (!viewport) {
      console.error(`No viewport for page ${pageNumber}. Cannot draw legend highlight.`);
      return;
    }
    const unscaledPageHeight = viewport.height / viewport.scale;
    
    const pageElement = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
    const svg = pageElement?.querySelector('.annotation-svg-overlay') as SVGElement | null;
    
    // 2. Find or Create the <page> node
    let pageNode = this.xmlDoc.querySelector(`page[number="${pageNumber}"]`);
    if (!pageNode) {
      pageNode = this.xmlDoc.createElement('page');
      pageNode.setAttribute('number', pageNumber.toString());
      this.xmlDoc.documentElement.appendChild(pageNode);
    }

    // 3. Parse bbox coordinates [x1, y1, x2, y2] (System 1: Top-Left)
    const [x1_tl, y1_tl, x2_tl, y2_tl] = bbox;
    
    // Convert to (x, y, w, h) format
    const x = Math.min(x1_tl, x2_tl);
    const y = Math.min(y1_tl, y2_tl);
    const width = Math.abs(x2_tl - x1_tl);
    const height = Math.abs(y2_tl - y1_tl);
    
    // 4. Create <annotation> node with type="legend"
    const annotationNode = this.xmlDoc.createElement("annotation");
    annotationNode.setAttribute("type", "legend");
    annotationNode.setAttribute("x", x.toFixed(2));
    annotationNode.setAttribute("y", y.toFixed(2));
    annotationNode.setAttribute("width", width.toFixed(2));
    annotationNode.setAttribute("height", height.toFixed(2));
    
    // Add text content as child element
    const textNode = this.xmlDoc.createElement("text");
    textNode.textContent = legendText;
    annotationNode.appendChild(textNode);
    
    pageNode.appendChild(annotationNode);

    // 5. Draw on visible SVG with label
    if (svg) {
      // 5a. Translate from Top-Left (System 1) to Bottom-Left (System 2)
      const y_bottom_edge_tl = y;
      const y_bl_pdf = unscaledPageHeight - y_bottom_edge_tl;

      // 5b. Convert Bottom-Left (System 2) to Viewport (System 3)
      const [viewportX, viewportY] = viewport.convertToViewportPoint(x, y_bl_pdf);
      
      const scaledWidth = width * viewport.scale;
      const scaledHeight = height * viewport.scale;

      // Use a distinct color for legend (purple/magenta)
      const legendColor = color ||'rgba(224, 31, 31, 0.56)';
      
      // Draw the rectangle
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", `${viewportX}`);
      rect.setAttribute("y", `${viewportY}`);
      rect.setAttribute("width", `${scaledWidth}`);
      rect.setAttribute("height", `${scaledHeight}`);
      rect.setAttribute("fill", "none"); // No background fill, only border
      rect.setAttribute('stroke', legendColor.replace('0.56', '1'));
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('class', 'xml-annotation-legend');
      svg.appendChild(rect);

      // Truncate text if too long
      const displayText = legendText.length > 40 ? legendText.substring(0, 40) + '...' : legendText;
      
      // Calculate text dimensions (approximate)
      const fontSize = 9;
      const textWidth = displayText.length * 5.5; // Approximate character width
      const textHeight = 14;
      const padding = 3;
      
      // Position at top-right corner (outside the box)
      const labelX = viewportX + scaledWidth - textWidth - padding;
      const labelY = viewportY - textHeight - 2; // Above the box
      
      // Add a background for better readability
      const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      textBg.setAttribute("x", `${labelX - padding}`);
      textBg.setAttribute("y", `${labelY - padding}`);
      textBg.setAttribute("width", `${textWidth + padding * 2}`);
      textBg.setAttribute("height", `${textHeight}`);
      textBg.setAttribute("fill", "rgba(207, 168, 168, 0.95)");
      textBg.setAttribute("stroke", "#666");
      textBg.setAttribute("stroke-width", "0.5");
      textBg.setAttribute("rx", "2");
      svg.appendChild(textBg);

      // Draw the label text at the top-right outside of the bounding box
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", `${labelX}`);
      text.setAttribute("y", `${labelY + fontSize}`);
      text.setAttribute("fill", "#333");
      text.setAttribute("font-size", `${fontSize}px`);
      text.setAttribute("font-weight", "600");
      text.setAttribute("font-family", "Arial, sans-serif");
      text.setAttribute("class", "legend-label");
      text.textContent = displayText;
      svg.appendChild(text);
    }

    // Save to server
    this.saveXmlToServer('legend', legendText);
    console.log('✅ Legend annotation added:', { page: pageNumber, bbox, text: legendText });
  }

  // Save XML - Now handles PDF-specific annotations
  saveXmlToServer(buttonControlId?: string, text?: string) {
    if (!this.xmlDoc) return;
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(this.xmlDoc);

    // Extract PDF filename for XML filename generation
    let pdfFileName = 'unknown.pdf';
    if (this.pdfSrc) {
      if (this.pdfSrc.includes('/')) {
        pdfFileName = this.pdfSrc.split('/').pop() || 'unknown.pdf';
      } else {
        pdfFileName = this.pdfSrc;
      }
    }

    // Generate XML filename based on PDF filename
    const xmlFileName = pdfFileName.replace(/\.pdf$/i, '') + '_annotations.xml';
    
    const payload: any = {
      pdfPath: this.pdfSrc,
      xmlFileName: xmlFileName,
      xmlContent: xmlString,
      buttonControlId: buttonControlId,
      text: text,
      projectId: parseInt(this.projectId, 10),
      revisionId: this.revisionId,
      revisionNo: this.revisionNo,
    };
    console.log("🚀 ~ DetectionComponent ~ saveXmlToServer ~ payload:", payload);
    
    this.dashboardService.saveXmlAnnotations(payload).subscribe({
      next: (response) => {
        console.log('✅ PDF-specific XML annotations saved to server:', response);
      },
      error: (err: any) => {
        console.error('❌ Error saving PDF-specific XML annotations to server:', err);
      },
    });
  }
  
  // --- All Panel/Checkbox Drag/Toggle Methods ---

  trackByButtonId(index: number, button: ButtonConfig): string {
    return button.id;
  }

  getButtonName(buttonId: string): string {
    for (const category of Object.keys(this.buttonGroups)) {
      const buttons = this.buttonGroups[category as keyof typeof this.buttonGroups];
      const button = buttons.find(btn => btn.id === buttonId);
      if (button) {
        return button.name || button.label;
      }
    }
    return buttonId;
  }

  isButtonSelected(buttonId: string): boolean {
    return this.selectedButtonId === buttonId;
  }

  onCheckboxChange(type: string, event: any): void {
    console.log(`${type} checkbox changed:`, event.target.checked);
    // Update panel positions when checkboxes change
    setTimeout(() => {
      this.updatePanelPositions();
    }, 10); // Small delay to allow checkbox state to update
  }

  // Update panel positions based on visible checkboxes
  updatePanelPositions(): void {
    const categories = ['site', 'building', 'door', 'frame', 'hw', 'ta', 'legend'];
    const visibleCategories = categories.filter(cat => this.checkboxes[cat as keyof typeof this.checkboxes]);
    
    const startX = 8;
    const startY = 40;
    const panelSpacing = 60; // Space between panels horizontally
    
    visibleCategories.forEach((category, index) => {
      this.panelPositions[category as keyof typeof this.panelPositions] = {
        x: startX + (index * panelSpacing),
        y: startY
      };
    });
  }


  getPanelStyle(category: 'site' | 'building' | 'door' | 'frame' | 'hw' | 'ta' | 'legend' | 'pdfControls'): any {
    return {
      left: this.panelPositions[category].x + 'px',
      top: this.panelPositions[category].y + 'px',
      cursor: this.draggingStates[category] ? 'grabbing' : 'grab'
    };
  }

  getCheckboxGroupStyle(): any {
    return {
      left: this.checkboxGroupPosition.x + 'px',
      top: this.checkboxGroupPosition.y + 'px',
      cursor: this.isCheckboxGroupDragging ? 'grabbing' : 'grab'
    };
  }

  toggleOrientation(category: 'site' | 'building' | 'door' | 'frame' | 'hw' | 'ta' | 'legend' | 'pdfControls'): void {
    this.orientationStates[category] = !this.orientationStates[category];
  }

  toggleCheckboxGroupOrientation(): void {
    this.checkboxGroupOrientation = !this.checkboxGroupOrientation;
  }

  // Smart click/drag for Panels
  onSmartMouseDown(event: MouseEvent, category: 'site' | 'building' | 'door' | 'frame' | 'hw' | 'ta' | 'legend' | 'pdfControls'): void {
    this.smartInteractionStates[category].startTime = Date.now();
    this.smartInteractionStates[category].startPosition = { x: event.clientX, y: event.clientY };
    this.smartInteractionStates[category].hasMoved = false;
    this.draggingStates[category] = true;
    this.dragOffsets[category].x = event.clientX - this.panelPositions[category].x;
    this.dragOffsets[category].y = event.clientY - this.panelPositions[category].y;
    
    const moveHandler = (e: MouseEvent) => this.onSmartMouseMove(e, category);
    const upHandler = () => this.onSmartMouseUp(category, moveHandler, upHandler);
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    event.preventDefault();
  }

  onSmartMouseMove(event: MouseEvent, category: 'site' | 'building' | 'door' | 'frame' | 'hw' | 'ta' | 'legend' | 'pdfControls'): void {
    if (!this.draggingStates[category]) return;
    
    const deltaX = Math.abs(event.clientX - this.smartInteractionStates[category].startPosition.x);
    const deltaY = Math.abs(event.clientY - this.smartInteractionStates[category].startPosition.y);

    if (deltaX > 5 || deltaY > 5) {
      this.smartInteractionStates[category].hasMoved = true;
      let newX = event.clientX - this.dragOffsets[category].x;
      let newY = event.clientY - this.dragOffsets[category].y;
      
      // ... (Alignment logic can be re-added here if needed) ...
      
      this.panelPositions[category].x = newX;
      this.panelPositions[category].y = newY;
    }
  }

  onSmartMouseUp(category: 'site' | 'building' | 'door' | 'frame' | 'hw' | 'ta' | 'legend' | 'pdfControls', moveHandler: any, upHandler: any): void {
    this.draggingStates[category] = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    
    if (!this.smartInteractionStates[category].hasMoved) {
      const timeDiff = Date.now() - this.smartInteractionStates[category].startTime;
      if (timeDiff < 200) {
        this.toggleOrientation(category);
      }
    }
    this.smartInteractionStates[category].hasMoved = false;
  }

  onSmartClick(event: MouseEvent, category: 'site' | 'building' | 'door' | 'frame' | 'hw' | 'ta' | 'legend' | 'pdfControls'): void {
    if (this.smartInteractionStates[category].hasMoved) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Smart click/drag for Checkbox Group
  onCheckboxGroupSmartMouseDown(event: MouseEvent): void {
    this.checkboxGroupSmartInteraction.startTime = Date.now();
    this.checkboxGroupSmartInteraction.startPosition = { x: event.clientX, y: event.clientY };
    this.checkboxGroupSmartInteraction.hasMoved = false;
    this.isCheckboxGroupDragging = true;
    this.checkboxGroupDragOffset.x = event.clientX - this.checkboxGroupPosition.x;
    this.checkboxGroupDragOffset.y = event.clientY - this.checkboxGroupPosition.y;
    
    const moveHandler = (e: MouseEvent) => this.onCheckboxGroupSmartMouseMove(e);
    const upHandler = () => this.onCheckboxGroupSmartMouseUp(upHandler, moveHandler);
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    event.preventDefault();
  }

  onCheckboxGroupSmartMouseMove(event: MouseEvent): void {
    if (!this.isCheckboxGroupDragging) return;

    const deltaX = Math.abs(event.clientX - this.checkboxGroupSmartInteraction.startPosition.x);
    const deltaY = Math.abs(event.clientY - this.checkboxGroupSmartInteraction.startPosition.y);
      
    if (deltaX > 5 || deltaY > 5) {
      this.checkboxGroupSmartInteraction.hasMoved = true;
      this.checkboxGroupPosition.x = event.clientX - this.checkboxGroupDragOffset.x;
      this.checkboxGroupPosition.y = event.clientY - this.checkboxGroupDragOffset.y;
    }
  }

  onCheckboxGroupSmartMouseUp(upHandler: any, moveHandler: any): void {
    this.isCheckboxGroupDragging = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    
    if (!this.checkboxGroupSmartInteraction.hasMoved) {
      const timeDiff = Date.now() - this.checkboxGroupSmartInteraction.startTime;
      if (timeDiff < 200) {
        this.toggleCheckboxGroupOrientation();
      }
    }
    this.checkboxGroupSmartInteraction.hasMoved = false;
  }

  onCheckboxGroupSmartClick(event: MouseEvent): void {
    if (this.checkboxGroupSmartInteraction.hasMoved) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // PDF Control Panel Methods (Zoom, Rotate)
  onPdfZoomIn(): void {
    // This will call the built-in ngx-extended-pdf-viewer zoom
    (window as any).PDFViewerApplication.zoomIn();
  }
  
  onPdfZoomOut(): void {
    (window as any).PDFViewerApplication.zoomOut();
  }
  
  onPdfRotateLeft(): void {
    (window as any).PDFViewerApplication.rotatePagesCounterclockwise();
  }
  
  onPdfRotateRight(): void {
    (window as any).PDFViewerApplication.rotatePagesClockwise();
  }

  // Project Info Handler
  private handleHeaderEvent = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const { eventType, data } = customEvent.detail;

    if (eventType === 'projectChanged') {
      console.log('Detection component received project change:', data);
      this.projectId = data.projectId || '';
      this.projectNumber = data.projectNumber || '';
      this.revisionId = data.revisionId || 1;
      this.revisionNo = data.revisionNo || 1;
      this.pdfSrc = '';
    }
  }

  // Notification
  private showCoordinateNotification(coordinates: PdfCoordinate): void {
    const message = `Coordinates: Page ${coordinates.page}, X: ${coordinates.x}, Y: ${coordinates.y}`;
    const notification = document.createElement('div');
    notification.style.cssText = `... (style as before) ...`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}